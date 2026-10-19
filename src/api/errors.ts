import { toMegabytes } from '@/file-size'
import { VIDEO_FORMATS_LABEL } from '@/labels'
import {
    type ApiErrorCode,
    apiErrorSchema,
    JobErrorCode,
    MAX_DURATION_S,
    MAX_PRESETS,
    MAX_UPLOAD_BYTES,
    RequestErrorCode,
} from 'adlens-shared'
import { AxiosError } from 'axios'

// Shown under a title that already names the cause (describeJobErrorTitle).
const NOT_COUNTED_COPY = 'It wasn’t counted against your analyses. Please try again.'

const ERROR_COPY: Record<ApiErrorCode, string> = {
    // The API never counts a run that ends without a result.
    [JobErrorCode.VideoUnreadable]:
        "We couldn't read this file as a video. Try exporting it again as MP4. This run wasn't counted.",
    [JobErrorCode.VideoTooLong]: `Videos can be up to ${MAX_DURATION_S} seconds long. This run wasn't counted.`,
    [JobErrorCode.VideoTooLarge]: `Videos can be up to ${toMegabytes(MAX_UPLOAD_BYTES)} MB. This run wasn't counted.`,
    [JobErrorCode.UnsupportedFormat]: `This video format isn't supported. Use ${VIDEO_FORMATS_LABEL}. This run wasn't counted.`,
    // A failure after the upload and the format checks passed is nothing the user can act on, so it gets one message.
    [JobErrorCode.AnalysisFailed]: NOT_COUNTED_COPY,
    [JobErrorCode.AnalysisTimedOut]: NOT_COUNTED_COPY,
    [JobErrorCode.ModelUnavailable]: `The AI service was overloaded or didn’t respond in time. ${NOT_COUNTED_COPY}`,
    [JobErrorCode.VideoCheckFailed]: NOT_COUNTED_COPY,
    [JobErrorCode.UploadFailed]: NOT_COUNTED_COPY,
    [RequestErrorCode.UploadIncomplete]: "The upload didn't finish. Please try again.",
    [RequestErrorCode.QuotaExceeded]: 'You’ve used all your analyses for the last 7 days.',
    [RequestErrorCode.SignUpRequired]: 'Sign in or create an account to continue',
    [RequestErrorCode.EmailConfirmationRequired]: 'Confirm your email to continue',
    [RequestErrorCode.ChallengeRequired]: 'Complete the security check, then run the analysis again.',
    [RequestErrorCode.ChallengeFailed]: 'The security check didn’t pass. Try it again, then run the analysis.',
    [RequestErrorCode.NetworkQuotaExceeded]:
        'Too many analyses from your internet connection this week. Contact us if you need more.',
    [RequestErrorCode.DisposableEmail]: 'Sign up with a permanent email address. Temporary inboxes aren’t accepted.',
    [RequestErrorCode.JobNotPending]: 'This analysis has already started.',
    [RequestErrorCode.JobNotRestartable]: 'Sorry, restart is not available for this analysis.',
    [RequestErrorCode.JobInProgress]: 'This analysis is still running. You can delete it once it finishes.',
    [RequestErrorCode.ValidationFailed]: 'Some of the settings are invalid.',
    [RequestErrorCode.PresetNameTaken]: 'A preset with this name already exists.',
    [RequestErrorCode.PresetLimitReached]: `You can keep up to ${MAX_PRESETS} presets. Delete one to save another.`,
    [RequestErrorCode.Unauthenticated]: 'Please sign in again.',
    [RequestErrorCode.NotFound]: "We couldn't find that analysis.",
    [RequestErrorCode.RateLimited]: 'Too many attempts. Wait a moment and try again.',
    [RequestErrorCode.Unavailable]: 'AdLens is briefly unavailable. Please try again.',
    [RequestErrorCode.Internal]: 'Something went wrong on our side. Please try again.',
}

// The contact form's own wording where the shared copy speaks of analyses or settings, or of a moment's wait (its
// limits are per hour), and to name what was uploading.
const CONTACT_ERROR_COPY: Partial<Record<ApiErrorCode, string>> = {
    [RequestErrorCode.ChallengeFailed]: 'The security check didn’t pass. Try it again, then send the message.',
    [RequestErrorCode.ValidationFailed]: 'We couldn’t send this message. Check it, then try again.',
    [RequestErrorCode.RateLimited]: 'Too many messages in the last hour. Please try again later.',
    [RequestErrorCode.UploadIncomplete]: 'An image didn’t finish uploading. Please try again.',
}

// The shared copy speaks of a missing analysis.
const PRESET_ERROR_COPY: Partial<Record<ApiErrorCode, string>> = {
    [RequestErrorCode.NotFound]: 'This preset no longer exists.',
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

export const describeJobErrorTitle = (code: JobErrorCode | undefined): string => {
    switch (code) {
        case JobErrorCode.VideoUnreadable:
        case JobErrorCode.VideoTooLong:
        case JobErrorCode.VideoTooLarge:
        case JobErrorCode.UnsupportedFormat:
            return 'This video can’t be analyzed'
        case JobErrorCode.UploadFailed:
            return 'The upload didn’t finish'
        case JobErrorCode.ModelUnavailable:
            return 'The AI service couldn’t complete this analysis'
        default:
            return 'Something went wrong with this analysis'
    }
}

export const describeRequestError = (code: RequestErrorCode): string => ERROR_COPY[code]

export const describeContactError = (err: unknown): string => {
    const { code, message } = toApiRequestError(err)

    return CONTACT_ERROR_COPY[code] ?? message
}

export const describePresetError = (err: unknown): string => {
    const { code, message } = toApiRequestError(err)

    return PRESET_ERROR_COPY[code] ?? message
}
