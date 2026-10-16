import { ApiRequestError } from '@/api/errors'
import { getLiveToken } from '@/api/live'
import type { AuthContextValue, AuthUser } from '@/auth/AuthContext'
import { useLiveStore } from '@/contexts/stores/liveStore'
import { MEMBER_USER, memberAuth, signedOutAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { QueryObserver } from '@tanstack/react-query'
import { act, waitFor } from '@testing-library/react'
import { getLiveChannel, LiveEvent, type LiveTokenRequest, RequestErrorCode } from 'adlens-shared'
import { admissionKey } from './useAdmission'
import { jobKey } from './useJob'
import { useLiveUpdates } from './useLiveUpdates'
import { PRESETS_KEY } from './usePresets'
import { quotaKey } from './useQuota'

type Handler = (payload: unknown) => void
type AuthCallback = (params: unknown, callback: (error: unknown, token: unknown) => void) => void

interface FakeClient {
    options: { authCallback: AuthCallback }
    channelName: string | null
    channelHandlers: Map<string, Handler>
    onConnection: Handler | null
    onMessage: Handler | null
    close: jest.Mock
}

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockClients: FakeClient[] = []

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/live', () => ({ getLiveToken: jest.fn() }))
// Virtual: Ably publishes its modular build for `import` only, which Jest's CommonJS resolver doesn't look for.
jest.mock(
    'ably/modular',
    () => ({
        FetchRequest: {},
        WebSocketTransport: {},
        BaseRealtime: jest.fn((options: FakeClient['options']) => {
            const client: FakeClient = {
                options,
                channelName: null,
                channelHandlers: new Map(),
                onConnection: null,
                onMessage: null,
                close: jest.fn(),
            }

            mockClients.push(client)

            return {
                close: client.close,
                connection: { on: (handler: Handler) => (client.onConnection = handler) },
                channels: {
                    get: (name: string) => {
                        client.channelName = name

                        return {
                            on: (event: string, handler: Handler) => client.channelHandlers.set(event, handler),
                            subscribe: (handler: Handler) => {
                                client.onMessage = handler

                                return Promise.resolve()
                            },
                        }
                    },
                },
            }
        }),
    }),
    { virtual: true },
)

const TOKEN_REQUEST: LiveTokenRequest = {
    keyName: 'app.key',
    timestamp: 0,
    capability: JSON.stringify({ [getLiveChannel(MEMBER_USER.id)]: ['subscribe'] }),
    nonce: 'nonce',
    mac: 'mac',
}

const OTHER_USER: AuthUser = { id: 'member-2', email: 'bo@example.com', name: 'Bo' }

const Probe = () => {
    useLiveUpdates()

    return null
}

const connect = async (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    const rendered = renderWithProviders(<Probe />)
    const invalidate = jest.spyOn(rendered.queryClient, 'invalidateQueries')

    await waitFor(() => expect(mockClients).toHaveLength(1))

    return { ...rendered, invalidate, client: mockClients[0] }
}

// What the auth callback hands Ably for one answer of the token route.
const askForToken = async (client: FakeClient) => {
    const callback = jest.fn()

    client.options.authCallback({}, callback)
    await waitFor(() => expect(callback).toHaveBeenCalled())

    return callback.mock.calls[0]
}

describe('useLiveUpdates', () => {
    beforeEach(() => {
        mockClients.length = 0
        jest.mocked(getLiveToken).mockReset().mockResolvedValue(TOKEN_REQUEST)
        useLiveStore.setState({ isConnectionLost: false })
    })

    it("subscribes to the user's own channel and closes it when the user leaves", async () => {
        const { client, unmount } = await connect()

        expect(client.channelName).toBe(getLiveChannel(MEMBER_USER.id))
        expect(client.onMessage).not.toBeNull()

        unmount()

        expect(client.close).toHaveBeenCalled()
    })

    it("moves to the new user's channel when another user signs in", async () => {
        const { client, rerender } = await connect()

        mockUseAuth.mockReturnValue({ ...memberAuth(), user: OTHER_USER })
        rerender(<Probe />)

        await waitFor(() => expect(mockClients).toHaveLength(2))
        expect(client.close).toHaveBeenCalled()
        expect(mockClients[1].channelName).toBe(getLiveChannel(OTHER_USER.id))
    })

    it('opens nothing when the tab is left before Ably has loaded', async () => {
        mockUseAuth.mockReturnValue(memberAuth())

        const { unmount } = renderWithProviders(<Probe />)

        unmount()
        await act(async () => undefined)

        expect(mockClients).toHaveLength(0)
    })

    it('opens nothing while signed out', async () => {
        mockUseAuth.mockReturnValue(signedOutAuth())
        renderWithProviders(<Probe />)

        await act(async () => undefined)

        expect(mockClients).toHaveLength(0)
    })

    it("reads the presets again when they've changed", async () => {
        const { client, invalidate } = await connect()

        act(() => client.onMessage?.({ name: LiveEvent.Presets }))

        expect(invalidate.mock.calls).toEqual([[{ queryKey: [PRESETS_KEY, MEMBER_USER.id] }]])
    })

    it('reads the changed job, the job list, the quota and the admission again', async () => {
        const { client, invalidate } = await connect()

        act(() => client.onMessage?.({ name: LiveEvent.Job, data: { id: 'job-1' } }))

        expect(invalidate.mock.calls).toEqual([
            [{ queryKey: jobKey(MEMBER_USER.id, 'job-1') }],
            [{ queryKey: ['jobs', MEMBER_USER.id] }],
            [{ queryKey: quotaKey(MEMBER_USER.id) }],
            [{ queryKey: admissionKey(MEMBER_USER.id) }],
        ])
    })

    it('restarts a read already on its way, which may have started before the change', async () => {
        const { client, queryClient } = await connect()
        let reads = 0

        // An observed query that has data, as every query a tab shows does: only then is a read restarted.
        queryClient.setQueryData([PRESETS_KEY, MEMBER_USER.id], 0)
        const observer = new QueryObserver(queryClient, {
            queryKey: [PRESETS_KEY, MEMBER_USER.id],
            queryFn: () => new Promise((resolve) => setTimeout(() => resolve(++reads), 10)),
        })
        const unsubscribe = observer.subscribe(() => undefined)

        act(() => client.onMessage?.({ name: LiveEvent.Presets }))

        await waitFor(() => expect(queryClient.getQueryData([PRESETS_KEY, MEMBER_USER.id])).toBe(2))
        unsubscribe()
    })

    it.each(['attached', 'update'])(
        'reads everything again after a %s that lost what was sent meanwhile, but not on the first attach',
        async (event) => {
            const { client, invalidate } = await connect()

            act(() => client.channelHandlers.get('attached')?.({ resumed: false }))
            act(() => client.channelHandlers.get(event)?.({ resumed: true }))

            expect(invalidate).not.toHaveBeenCalled()

            act(() => client.channelHandlers.get(event)?.({ resumed: false }))

            expect(invalidate.mock.calls).toEqual([
                [{ queryKey: [PRESETS_KEY, MEMBER_USER.id] }],
                [{ queryKey: ['job', MEMBER_USER.id] }],
                [{ queryKey: ['jobs', MEMBER_USER.id] }],
            ])
        },
    )

    it('says the connection is lost while Ably tries again, until it is connected', async () => {
        const { client } = await connect()

        act(() => client.onConnection?.({ current: 'disconnected' }))
        act(() => client.onConnection?.({ current: 'connecting' }))

        expect(useLiveStore.getState().isConnectionLost).toBe(true)

        act(() => client.onConnection?.({ current: 'connected' }))

        expect(useLiveStore.getState().isConnectionLost).toBe(false)
    })

    it('closes and stops warning once the connection has failed for good', async () => {
        const { client } = await connect()

        act(() => client.onConnection?.({ current: 'suspended' }))
        act(() => client.onConnection?.({ current: 'failed' }))

        expect(useLiveStore.getState().isConnectionLost).toBe(false)
        expect(client.close).toHaveBeenCalled()
    })

    it('gives Ably each token request the API signs', async () => {
        const { client } = await connect()

        expect(await askForToken(client)).toEqual([null, TOKEN_REQUEST])
    })

    it.each([
        ['the API has no Ably key', () => jest.mocked(getLiveToken).mockResolvedValue(null)],
        [
            'the API has no token route',
            () => jest.mocked(getLiveToken).mockRejectedValue(new ApiRequestError(RequestErrorCode.NotFound)),
        ],
    ])('tells Ably to stop for good when %s', async (_reason, arrange) => {
        const { client } = await connect()

        arrange()

        expect(await askForToken(client)).toEqual([expect.objectContaining({ statusCode: 403 }), null])
    })

    it('lets Ably try again when the API cannot be reached', async () => {
        const { client } = await connect()

        jest.mocked(getLiveToken).mockRejectedValue(new Error('Network Error'))

        expect(await askForToken(client)).toEqual([expect.any(String), null])
    })
})
