import { announceSessionChange } from '@/auth/session'
import { getGlobalBroadcastChannel } from 'better-auth/client'

jest.mock('@/auth/authClient', () => ({ authClient: { $store: { notify: jest.fn() } } }))

describe('announceSessionChange', () => {
    afterEach(() => jest.restoreAllMocks())

    it('tells other tabs through Better Auth’s channel that the session changed, so they fetch it again', () => {
        const post = jest.spyOn(getGlobalBroadcastChannel(), 'post')

        announceSessionChange()

        expect(post).toHaveBeenCalledWith({
            event: 'session',
            data: { trigger: 'updateUser' },
            clientId: expect.any(String),
        })
    })
})
