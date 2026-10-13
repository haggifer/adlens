import {
    ApiRequestError,
    describeContactError,
    describeJobError,
    describeJobErrorTitle,
    describePresetError,
    toApiRequestError,
} from '@/api/errors'
import { JobErrorCode, RequestErrorCode } from 'adlens-shared'
import { AxiosError, AxiosHeaders } from 'axios'

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
            'Sign in or create an account to continue',
        )
        expect(new ApiRequestError(RequestErrorCode.EmailConfirmationRequired).message).toBe(
            'Confirm your email to continue',
        )
        expect(new ApiRequestError(RequestErrorCode.NetworkQuotaExceeded).message).toBe(
            'Too many analyses from your internet connection this week. Contact us if you need more.',
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
        expect(describeJobError(JobErrorCode.VideoTooLong)).toBe(
            "Videos can be up to 60 seconds long. This run wasn't counted.",
        )
        expect(describeJobError(undefined)).toBe(describeJobError(JobErrorCode.AnalysisFailed))
    })

    it.each([
        JobErrorCode.AnalysisFailed,
        JobErrorCode.AnalysisTimedOut,
        JobErrorCode.VideoCheckFailed,
        JobErrorCode.UploadFailed,
    ])('says a run that ended in %s wasn’t counted and can be tried again', (code) => {
        expect(describeJobError(code)).toBe('It wasn’t counted against your analyses. Please try again.')
    })

    it.each([
        JobErrorCode.VideoUnreadable,
        JobErrorCode.VideoTooLong,
        JobErrorCode.VideoTooLarge,
        JobErrorCode.UnsupportedFormat,
    ])('says what to change about a video rejected with %s, and that the run wasn’t counted', (code) => {
        expect(describeJobError(code)).toMatch(/ This run wasn't counted\.$/)
    })
})

describe('describeJobErrorTitle', () => {
    it.each([JobErrorCode.AnalysisFailed, JobErrorCode.AnalysisTimedOut, JobErrorCode.VideoCheckFailed, undefined])(
        'gives a backend failure (%s) one general title',
        (code) => {
            expect(describeJobErrorTitle(code)).toBe('Something went wrong with this analysis')
        },
    )

    it.each([
        JobErrorCode.VideoUnreadable,
        JobErrorCode.VideoTooLong,
        JobErrorCode.VideoTooLarge,
        JobErrorCode.UnsupportedFormat,
    ])('says a video rejected with %s can’t be analyzed', (code) => {
        expect(describeJobErrorTitle(code)).toBe('This video can’t be analyzed')
    })

    it('says an upload that never finished didn’t finish', () => {
        expect(describeJobErrorTitle(JobErrorCode.UploadFailed)).toBe('The upload didn’t finish')
    })
})

describe('describeContactError', () => {
    it('words the security check, validation and rate limits for a message rather than an analysis', () => {
        expect(describeContactError(new ApiRequestError(RequestErrorCode.ChallengeFailed))).toBe(
            'The security check didn’t pass. Try it again, then send the message.',
        )
        expect(describeContactError(new ApiRequestError(RequestErrorCode.ValidationFailed))).toBe(
            'We couldn’t send this message. Check it, then try again.',
        )
        expect(describeContactError(new ApiRequestError(RequestErrorCode.RateLimited))).toBe(
            'Too many messages in the last hour. Please try again later.',
        )
    })

    it('says it was an image that didn’t finish uploading', () => {
        expect(describeContactError(new ApiRequestError(RequestErrorCode.UploadIncomplete))).toBe(
            'An image didn’t finish uploading. Please try again.',
        )
    })

    it('falls back to the shared copy, and never shows the raw text of an unknown failure', () => {
        expect(describeContactError(new ApiRequestError(RequestErrorCode.Unavailable))).toBe(
            'AdLens is briefly unavailable. Please try again.',
        )
        expect(describeContactError(new Error('socket hang up'))).toBe(
            'Something went wrong on our side. Please try again.',
        )
    })
})

describe('describePresetError', () => {
    it('says a preset name is taken, the preset limit is reached, or the preset no longer exists', () => {
        expect(describePresetError(new ApiRequestError(RequestErrorCode.PresetNameTaken))).toBe(
            'A preset with this name already exists.',
        )
        expect(describePresetError(new ApiRequestError(RequestErrorCode.PresetLimitReached))).toBe(
            'You can keep up to 20 presets. Delete one to save another.',
        )
        expect(describePresetError(new ApiRequestError(RequestErrorCode.NotFound))).toBe(
            'This preset no longer exists.',
        )
    })

    it('falls back to the shared copy, and never shows the raw text of an unknown failure', () => {
        expect(describePresetError(new ApiRequestError(RequestErrorCode.Unavailable))).toBe(
            'AdLens is briefly unavailable. Please try again.',
        )
        expect(describePresetError(new Error('socket hang up'))).toBe(
            'Something went wrong on our side. Please try again.',
        )
    })
})
