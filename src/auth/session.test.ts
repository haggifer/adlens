import { announceSessionChange } from '@/auth/session'

jest.mock('@/auth/authClient', () => ({ authClient: { $store: { notify: jest.fn() } } }))

// Better Auth's cross-tab channel: a localStorage entry that other tabs see as a storage event.
const CHANNEL_KEY = 'better-auth.message'

describe('announceSessionChange', () => {
    afterEach(() => localStorage.clear())

    it('tells other tabs through Better Auth’s channel that the session changed, so they fetch it again', () => {
        announceSessionChange()

        expect(JSON.parse(localStorage.getItem(CHANNEL_KEY) ?? '{}')).toEqual({
            event: 'session',
            data: { trigger: 'updateUser' },
            clientId: expect.any(String),
            timestamp: expect.any(Number),
        })
    })
})
