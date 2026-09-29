import { describeError, runAuthRequest } from '@/auth/errors'

const GENERIC_COPY = 'Something went wrong. Please try again.'
const RATE_LIMITED_COPY = 'Too many attempts. Wait a minute and try again.'

describe('describeError', () => {
    it('shows the copy for a known Better Auth code', () => {
        expect(describeError({ code: 'DISPOSABLE_EMAIL' })).toBe(
            'Sign up with a permanent email address. Temporary inboxes aren’t accepted.',
        )
        expect(describeError({ code: 'ACCOUNT_LINK_FAILED' })).toBe(
            'You’re signed in, but your earlier analyses couldn’t be moved. Contact us and we’ll move them.',
        )
    })

    it('shows the copy for a code a social provider sent back', () => {
        expect(describeError({ code: 'access_denied' })).toBe('Sign-in was cancelled.')
    })

    it('shows a rate limit whatever code comes with it', () => {
        expect(describeError({ status: 429, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(RATE_LIMITED_COPY)
    })

    it('never shows the server’s own message', () => {
        expect(describeError({ code: 'SOME_NEW_CODE', message: 'MongoServerError: E11000 duplicate key' })).toBe(
            GENERIC_COPY,
        )
        expect(describeError({ message: 'Internal detail' })).toBe(GENERIC_COPY)
        expect(describeError(null)).toBe(GENERIC_COPY)
    })

    it('doesn’t read a code from the object prototype', () => {
        expect(describeError({ code: 'constructor' })).toBe(GENERIC_COPY)
        expect(describeError({ code: 'toString' })).toBe(GENERIC_COPY)
        expect(describeError({ code: '__proto__' })).toBe(GENERIC_COPY)
    })
})

describe('runAuthRequest', () => {
    afterEach(() => jest.restoreAllMocks())

    it('returns null when the request succeeds', async () => {
        await expect(runAuthRequest(async () => ({ error: null }))).resolves.toBeNull()
    })

    it('returns the error Better Auth answered with', async () => {
        const error = { code: 'INVALID_TOKEN', status: 400 }

        await expect(runAuthRequest(async () => ({ error }))).resolves.toBe(error)
    })

    it('turns a request that never reached the API into a network error', async () => {
        const failure = new TypeError('Failed to fetch')
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

        const error = await runAuthRequest(async () => {
            throw failure
        })

        expect(error).toEqual({ code: 'NETWORK_ERROR' })
        expect(describeError(error)).toBe('Couldn’t reach AdLens. Check your connection and try again.')
        expect(consoleError).toHaveBeenCalledWith(failure)
    })
})
