import { describeError, isNetworkError, isRateLimited, runAuthQuery, runAuthRequest } from '@/auth/errors'

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

    it('says an address already in use for sign-up is taken', () => {
        expect(describeError({ status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' })).toBe(
            'This email is already in use. Sign in instead.',
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

describe('runAuthQuery', () => {
    afterEach(() => jest.restoreAllMocks())

    it('returns the data of a request that succeeds', async () => {
        const data = { user: { id: 'u1' } }

        await expect(runAuthQuery(async () => ({ data, error: null }))).resolves.toEqual({ data, error: null })
    })

    it('returns no data with the error Better Auth answered with', async () => {
        const error = { status: 500 }

        await expect(runAuthQuery(async () => ({ data: null, error }))).resolves.toEqual({ data: null, error })
    })

    it('turns a request that never reached the API into a network error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {})

        const result = await runAuthQuery(async () => {
            throw new TypeError('Failed to fetch')
        })

        expect(result.data).toBeNull()
        expect(isNetworkError(result.error)).toBe(true)
    })
})

describe('isRateLimited', () => {
    it('recognises a rate-limited answer by its status alone', () => {
        expect(isRateLimited({ status: 429, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(true)
        expect(isRateLimited({ status: 400 })).toBe(false)
        expect(isRateLimited(null)).toBe(false)
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
