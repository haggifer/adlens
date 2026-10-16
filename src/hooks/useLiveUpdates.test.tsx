import { getLiveToken } from '@/api/live'
import type { AuthContextValue } from '@/auth/AuthContext'
import { useLiveStore } from '@/contexts/stores/liveStore'
import { MEMBER_USER, memberAuth, signedOutAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { act, waitFor } from '@testing-library/react'
import { getLiveChannel, LiveEvent, type LiveTokenRequest } from 'adlens-shared'
import { jobKey } from './useJob'
import { useLiveUpdates } from './useLiveUpdates'
import { PRESETS_KEY } from './usePresets'

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

const refetched = (queryKey: unknown[]) => [{ queryKey }, { cancelRefetch: false }]

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

    it("reads the presets again when they've changed", async () => {
        const { client, invalidate } = await connect()

        act(() => client.onMessage?.({ name: LiveEvent.Presets }))

        expect(invalidate.mock.calls).toEqual([refetched([PRESETS_KEY, MEMBER_USER.id])])
    })

    it('reads the changed job and the job list again', async () => {
        const { client, invalidate } = await connect()

        act(() => client.onMessage?.({ name: LiveEvent.Job, data: { id: 'job-1' } }))

        expect(invalidate.mock.calls).toEqual([
            refetched(jobKey(MEMBER_USER.id, 'job-1')),
            refetched(['jobs', MEMBER_USER.id]),
        ])
    })

    it('reads everything again when Ably could not keep what was sent during a drop, but not on the first attach', async () => {
        const { client, invalidate } = await connect()

        act(() => client.channelHandlers.get('attached')?.({ resumed: false }))
        act(() => client.channelHandlers.get('attached')?.({ resumed: true }))

        expect(invalidate).not.toHaveBeenCalled()

        act(() => client.channelHandlers.get('attached')?.({ resumed: false }))

        expect(invalidate.mock.calls).toEqual([
            refetched([PRESETS_KEY, MEMBER_USER.id]),
            refetched(['job', MEMBER_USER.id]),
            refetched(['jobs', MEMBER_USER.id]),
        ])
    })

    it('says when the connection is lost, until it is back', async () => {
        const { client } = await connect()

        act(() => client.onConnection?.({ current: 'disconnected' }))

        expect(useLiveStore.getState().isConnectionLost).toBe(true)

        act(() => client.onConnection?.({ current: 'connected' }))

        expect(useLiveStore.getState().isConnectionLost).toBe(false)
    })

    it('gives Ably the token request it already has first, then asks the API for each new one', async () => {
        const { client } = await connect()
        const callback = jest.fn()

        client.options.authCallback({}, callback)

        expect(callback).toHaveBeenCalledWith(null, TOKEN_REQUEST)
        expect(getLiveToken).toHaveBeenCalledTimes(1)

        client.options.authCallback({}, callback)

        await waitFor(() => expect(callback).toHaveBeenCalledTimes(2))
        expect(getLiveToken).toHaveBeenCalledTimes(2)
    })

    it.each([
        ['live updates are off', () => jest.mocked(getLiveToken).mockResolvedValue(null)],
        ['the API cannot be reached', () => jest.mocked(getLiveToken).mockRejectedValue(new Error('Network Error'))],
    ])('connects nowhere when %s', async (_reason, arrange) => {
        arrange()
        mockUseAuth.mockReturnValue(memberAuth())
        renderWithProviders(<Probe />)

        await waitFor(() => expect(getLiveToken).toHaveBeenCalled())
        await act(async () => undefined)

        expect(mockClients).toHaveLength(0)
    })

    it('asks for nothing while signed out', async () => {
        mockUseAuth.mockReturnValue(signedOutAuth())
        renderWithProviders(<Probe />)

        await act(async () => undefined)

        expect(getLiveToken).not.toHaveBeenCalled()
    })
})
