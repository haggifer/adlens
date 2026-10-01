import { JobErrorCode, RequestErrorCode } from 'adlens-shared'
import { AxiosError, AxiosHeaders } from 'axios'
import { ApiRequestError, describeJobError, toApiRequestError } from '@/api/errors'

const axiosErrorWithResponse = (status: number, data: unknown) =>
    new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data,
    })

describe('toApiRequestError', () => {
    it('keeps the error code from an API error body and shows its copy, not the server message', () => {
        const error = toApiRequestError(
            axiosErrorWithResponse(429, { statusCode: 429, errorCode: 'QUOTA_EXCEEDED', message: 'quota' }),
        )

        expect(error.code).toBe(RequestErrorCode.QuotaExceeded)
        expect(error.message).toBe('You’ve used all your analyses for the last 7 days.')
    })

    it('treats an error code this client doesn’t know yet as an internal error', () => {
        const error = toApiRequestError(
            axiosErrorWithResponse(400, { statusCode: 400, errorCode: 'SOME_NEW_CODE', message: 'Raw server text' }),
        )

        expect(error.code).toBe(RequestErrorCode.Internal)
        expect(error.message).toBe('Something went wrong on our side. Please try again.')
    })

    it('treats a response without an API error body as an internal error', () => {
        expect(toApiRequestError(axiosErrorWithResponse(502, '<html>Bad gateway</html>')).code).toBe(
            RequestErrorCode.Internal,
        )
    })

    it('treats a request that got no response as the API being unavailable', () => {
        expect(toApiRequestError(new AxiosError('Network Error', 'ERR_NETWORK')).code).toBe(
            RequestErrorCode.Unavailable,
        )
    })

    it('passes an ApiRequestError through and wraps anything else as internal', () => {
        const original = new ApiRequestError(RequestErrorCode.NotFound)

        expect(toApiRequestError(original)).toBe(original)
        expect(toApiRequestError(new Error('boom')).code).toBe(RequestErrorCode.Internal)
    })

    it('explains the network, challenge, sign-up and confirmation limits', () => {
        expect(new ApiRequestError(RequestErrorCode.SignUpRequired).message).toBe(
            'You’ve used your free analysis. Sign in or create an account to run more.',
        )
        expect(new ApiRequestError(RequestErrorCode.EmailConfirmationRequired).message).toBe(
            'Confirm your email to run more analyses.',
        )
        expect(new ApiRequestError(RequestErrorCode.NetworkQuotaExceeded).message).toBe(
            'Too many analyses from your network this week. Contact us if you need more.',
        )
        expect(new ApiRequestError(RequestErrorCode.ChallengeRequired).message).toBe(
            'Complete the security check, then run the analysis again.',
        )
        expect(new ApiRequestError(RequestErrorCode.ChallengeFailed).message).toBe(
            'The security check didn’t pass. Try it again, then run the analysis.',
        )
        expect(new ApiRequestError(RequestErrorCode.DisposableEmail).message).toBe(
            'Sign up with a permanent email address. Temporary inboxes aren’t accepted.',
        )
    })
})

describe('describeJobError', () => {
    it('describes the job error code, falling back to a generic analysis failure', () => {
        expect(describeJobError(JobErrorCode.VideoTooLong)).toBe('Videos can be up to 60 seconds long.')
        expect(describeJobError(undefined)).toBe(describeJobError(JobErrorCode.AnalysisFailed))
    })
})
