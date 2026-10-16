import { describeRequestError } from '@/api/errors'
import {
    describeConfirmError,
    describeError,
    describeResetError,
    isNetworkError,
    isRateLimited,
    runAuthQuery,
    runAuthRequest,
} from '@/auth/errors'
import { RequestErrorCode } from 'adlens-shared'

const GENERIC_COPY = describeError(null)

describe('describeError', () => {
    it('takes the copy of a code adlens-shared declares from its one owner', () => {
        expect(describeError({ code: RequestErrorCode.DisposableEmail })).toBe(
            describeRequestError(RequestErrorCode.DisposableEmail),
        )
    })

    it('shows a rate limit whatever code comes with it', () => {
        const rateLimited = describeError({ status: 429 })

        expect(describeError({ status: 429, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(rateLimited)
        expect(describeError({ code: 'INVALID_EMAIL_OR_PASSWORD' })).not.toBe(rateLimited)
        expect(rateLimited).not.toBe(GENERIC_COPY)
    })

    it('never shows the server’s own message', () => {
        expect(describeError({ code: 'SOME_NEW_CODE', message: 'MongoServerError: E11000 duplicate key' })).toBe(
            GENERIC_COPY,
        )
        expect(describeError({ message: 'Internal detail' })).toBe(GENERIC_COPY)
    })

    it('doesn’t read a code from the object prototype', () => {
        expect(describeError({ code: 'constructor' })).toBe(GENERIC_COPY)
        expect(describeError({ code: 'toString' })).toBe(GENERIC_COPY)
        expect(describeError({ code: '__proto__' })).toBe(GENERIC_COPY)
    })
})

describe('describeConfirmError', () => {
    it('says another account already confirmed the mailbox, where sign-up would say the address is taken', () => {
        const mailboxTaken = { status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' }

        expect(describeConfirmError(mailboxTaken)).not.toBe(describeError(mailboxTaken))
    })

    it('describes every other answer as describeError does', () => {
        expect(describeConfirmError({ code: 'TOKEN_EXPIRED' })).toBe(describeError({ code: 'TOKEN_EXPIRED' }))
        expect(describeConfirmError({ status: 429, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' })).toBe(
            describeError({ status: 429 }),
        )
    })
})

describe('describeResetError', () => {
    it('says the link expired or was used, since a reset answers both with INVALID_TOKEN', () => {
        const invalidToken = { status: 400, code: 'INVALID_TOKEN' }

        expect(describeResetError(invalidToken)).not.toBe(describeError(invalidToken))
    })

    it('describes every other answer as describeError does', () => {
        expect(describeResetError({ code: 'PASSWORD_TOO_SHORT' })).toBe(describeError({ code: 'PASSWORD_TOO_SHORT' }))
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
        expect(consoleError).toHaveBeenCalledWith(failure)
    })
})
