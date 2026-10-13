import { ApiRequestError } from '@/api/errors'
import { ensureSession } from '@/auth/anonymous-session'
import { authClient, signIn } from '@/auth/authClient'
import { refreshSession } from '@/auth/session'
import { RequestErrorCode } from 'adlens-shared'

jest.mock('@/auth/authClient', () => ({
    authClient: { getSession: jest.fn() },
    signIn: { anonymous: jest.fn() },
}))
jest.mock('@/auth/session', () => ({ refreshSession: jest.fn() }))

const expectRequestError = async (code: RequestErrorCode) => {
    const error = await ensureSession().catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).code).toBe(code)
}

describe('ensureSession', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null } as never)
        jest.mocked(signIn.anonymous).mockResolvedValue({ data: null, error: null } as never)
    })

    afterEach(() => jest.restoreAllMocks())

    it('signs in anonymously when the cookie holds no session', async () => {
        await ensureSession()

        expect(signIn.anonymous).toHaveBeenCalledTimes(1)
        expect(refreshSession).not.toHaveBeenCalled()
    })

    it('uses the session it finds instead of signing in anonymously over it, and catches the page up', async () => {
        jest.mocked(authClient.getSession).mockResolvedValueOnce({
            data: { user: { id: 'member-1' } },
            error: null,
        } as never)

        await ensureSession()

        expect(signIn.anonymous).not.toHaveBeenCalled()
        expect(refreshSession).toHaveBeenCalledTimes(1)
    })

    it('doesn’t sign in anonymously when the session check can’t reach the API', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(authClient.getSession).mockRejectedValueOnce(new TypeError('Failed to fetch'))

        await expectRequestError(RequestErrorCode.Unavailable)
        expect(signIn.anonymous).not.toHaveBeenCalled()
    })

    it('treats a session check the API answered with an error as unknown', async () => {
        jest.mocked(authClient.getSession).mockResolvedValueOnce({ data: null, error: { status: 500 } } as never)

        await expectRequestError(RequestErrorCode.Unavailable)
        expect(signIn.anonymous).not.toHaveBeenCalled()
    })

    it('explains a rate-limited anonymous sign-in', async () => {
        jest.mocked(signIn.anonymous).mockResolvedValueOnce({ data: null, error: { status: 429 } } as never)

        await expectRequestError(RequestErrorCode.RateLimited)
    })

    it('treats an anonymous sign-in that can’t reach the API as unavailable', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(signIn.anonymous).mockRejectedValueOnce(new TypeError('Failed to fetch'))

        await expectRequestError(RequestErrorCode.Unavailable)
    })

    it('treats any other refused anonymous sign-in as internal', async () => {
        jest.mocked(signIn.anonymous).mockResolvedValueOnce({ data: null, error: { status: 500 } } as never)

        await expectRequestError(RequestErrorCode.Internal)
    })
})
