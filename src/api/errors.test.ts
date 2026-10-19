import {
    ApiRequestError,
    describeContactError,
    describeJobError,
    describeJobErrorTitle,
    describePresetError,
    describeRequestError,
    toApiRequestError,
} from '@/api/errors'
import { MAX_DURATION_LABEL } from '@/labels'
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

// Nothing the user can act on, so they share one message.
const BACKEND_FAILURES = [
    JobErrorCode.AnalysisFailed,
    JobErrorCode.AnalysisTimedOut,
    JobErrorCode.VideoCheckFailed,
    JobErrorCode.UploadFailed,
]

const VIDEO_REJECTIONS = [
    JobErrorCode.VideoUnreadable,
    JobErrorCode.VideoTooLong,
    JobErrorCode.VideoTooLarge,
    JobErrorCode.UnsupportedFormat,
]

const CONTACT_OVERRIDES = [
    RequestErrorCode.ChallengeFailed,
    RequestErrorCode.ValidationFailed,
    RequestErrorCode.RateLimited,
    RequestErrorCode.UploadIncomplete,
]

describe('toApiRequestError', () => {
    it('keeps the error code from an API error body and shows its copy, not the server message', () => {
        const error = toApiRequestError(
            axiosErrorWithResponse(429, { statusCode: 429, errorCode: 'QUOTA_EXCEEDED', message: 'quota' }),
        )

        expect(error.code).toBe(RequestErrorCode.QuotaExceeded)
        expect(error.message).toBe(describeRequestError(RequestErrorCode.QuotaExceeded))
    })

    it('treats an error code this client doesn’t know yet as an internal error', () => {
        const error = toApiRequestError(
            axiosErrorWithResponse(400, { statusCode: 400, errorCode: 'SOME_NEW_CODE', message: 'Raw server text' }),
        )

        expect(error.code).toBe(RequestErrorCode.Internal)
        expect(error.message).toBe(describeRequestError(RequestErrorCode.Internal))
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
})

describe('describeJobError', () => {
    it('describes the job error code, falling back to a generic analysis failure', () => {
        expect(describeJobError(JobErrorCode.VideoTooLong)).toContain(MAX_DURATION_LABEL)
        expect(describeJobError(undefined)).toBe(describeJobError(JobErrorCode.AnalysisFailed))
    })

    it('gives every failure the user can’t act on one message', () => {
        expect(new Set(BACKEND_FAILURES.map(describeJobError)).size).toBe(1)
    })
})

describe('describeJobErrorTitle', () => {
    it('gives each group of failures one title of its own', () => {
        const backendTitle = describeJobErrorTitle(JobErrorCode.AnalysisFailed)
        const rejectionTitle = describeJobErrorTitle(JobErrorCode.VideoUnreadable)
        const uploadTitle = describeJobErrorTitle(JobErrorCode.UploadFailed)

        for (const code of [JobErrorCode.AnalysisTimedOut, JobErrorCode.VideoCheckFailed, undefined]) {
            expect(describeJobErrorTitle(code)).toBe(backendTitle)
        }

        for (const code of VIDEO_REJECTIONS) {
            expect(describeJobErrorTitle(code)).toBe(rejectionTitle)
        }

        expect(new Set([backendTitle, rejectionTitle, uploadTitle]).size).toBe(3)
    })
})

describe('describeContactError', () => {
    it.each(CONTACT_OVERRIDES)('words %s for a message rather than an analysis', (code) => {
        expect(describeContactError(new ApiRequestError(code))).not.toBe(describeRequestError(code))
    })

    it('falls back to the shared copy, and never shows the raw text of an unknown failure', () => {
        expect(describeContactError(new ApiRequestError(RequestErrorCode.Unavailable))).toBe(
            describeRequestError(RequestErrorCode.Unavailable),
        )
        expect(describeContactError(new Error('socket hang up'))).toBe(describeRequestError(RequestErrorCode.Internal))
    })
})

describe('describePresetError', () => {
    it('says a preset rather than an analysis no longer exists', () => {
        expect(describePresetError(new ApiRequestError(RequestErrorCode.NotFound))).not.toBe(
            describeRequestError(RequestErrorCode.NotFound),
        )
    })

    it('falls back to the shared copy, and never shows the raw text of an unknown failure', () => {
        expect(describePresetError(new ApiRequestError(RequestErrorCode.PresetLimitReached))).toBe(
            describeRequestError(RequestErrorCode.PresetLimitReached),
        )
        expect(describePresetError(new Error('socket hang up'))).toBe(describeRequestError(RequestErrorCode.Internal))
    })
})
