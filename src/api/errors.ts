import {
    type ApiErrorCode,
    apiErrorSchema,
    JobErrorCode,
    MAX_DURATION_S,
    MAX_UPLOAD_BYTES,
    RequestErrorCode,
} from 'adlens-shared'
import { AxiosError } from 'axios'
import { VIDEO_FORMATS_LABEL } from '@/labels'

const ERROR_COPY: Record<ApiErrorCode, string> = {
    [JobErrorCode.VideoUnreadable]: "We couldn't read this file as a video. Try exporting it again as MP4.",
    [JobErrorCode.VideoTooLong]: `Videos can be up to ${MAX_DURATION_S} seconds long.`,
    [JobErrorCode.VideoTooLarge]: `Videos can be up to ${MAX_UPLOAD_BYTES / (1000 * 1000)} MB.`,
    [JobErrorCode.UnsupportedFormat]: `This video format isn't supported. Use ${VIDEO_FORMATS_LABEL}.`,
    [JobErrorCode.AnalysisFailed]: "The analysis failed and your run wasn't counted. Please try again.",
    [JobErrorCode.AnalysisTimedOut]: "The analysis took too long and was stopped. Your run wasn't counted.",
    [RequestErrorCode.UploadIncomplete]: "The upload didn't finish. Please try again.",
    [RequestErrorCode.QuotaExceeded]: "You've used all your analyses for this 7-day window.",
    [RequestErrorCode.JobNotPending]: 'This analysis has already started.',
    [RequestErrorCode.JobInProgress]: 'This analysis is still running. You can delete it once it finishes.',
    [RequestErrorCode.ValidationFailed]: 'Some of the settings are invalid.',
    [RequestErrorCode.Unauthenticated]: 'Please sign in again.',
    [RequestErrorCode.NotFound]: "We couldn't find that analysis.",
    [RequestErrorCode.RateLimited]: 'Too many requests. Wait a moment and try again.',
    [RequestErrorCode.Unavailable]: 'AdLens is briefly unavailable. Please try again.',
    [RequestErrorCode.Internal]: 'Something went wrong on our side. Please try again.',
}

// A failed API call, reduced to its stable code; the message is the copy shown to the user.
export class ApiRequestError extends Error {
    constructor(readonly code: ApiErrorCode) {
        super(ERROR_COPY[code])
    }
}

export const toApiRequestError = (err: unknown): ApiRequestError => {
    if (err instanceof ApiRequestError) {
        return err
    }

    if (err instanceof AxiosError) {
        const body = apiErrorSchema.safeParse(err.response?.data)

        if (body.success) {
            return new ApiRequestError(body.data.errorCode)
        }

        return new ApiRequestError(err.response ? RequestErrorCode.Internal : RequestErrorCode.Unavailable)
    }

    return new ApiRequestError(RequestErrorCode.Internal)
}

export const describeJobError = (code: JobErrorCode | undefined): string =>
    ERROR_COPY[code ?? JobErrorCode.AnalysisFailed]
