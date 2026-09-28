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

    it('explains the network limits and where they lead', () => {
        expect(new ApiRequestError(RequestErrorCode.SignUpRequired).message).toBe(
            'You’ve used the analyses available without an account. Sign up to keep analysing.',
        )
        expect(new ApiRequestError(RequestErrorCode.NetworkQuotaExceeded).message).toBe(
            'Too many analyses from your network this week. Contact us if you need more.',
        )
        expect(new ApiRequestError(RequestErrorCode.ChallengeRequired).message).toBe(
            'Complete the security check, then run the analysis again.',
        )
    })
})

describe('describeJobError', () => {
    it('describes the job error code, falling back to a generic analysis failure', () => {
        expect(describeJobError(JobErrorCode.VideoTooLong)).toBe('Videos can be up to 60 seconds long.')
        expect(describeJobError(undefined)).toBe(describeJobError(JobErrorCode.AnalysisFailed))
    })
})
