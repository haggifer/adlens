import { toMegabytes } from '@/file-size'
import { VIDEO_FORMATS_LABEL } from '@/labels'
import { MAX_DURATION_S, MAX_UPLOAD_BYTES } from 'adlens-shared'

export const UPLOAD_NOTICE = {
    unsupportedFormat: `Please upload a video in one of these formats: ${VIDEO_FORMATS_LABEL}.`,
    tooLarge: `Video must be under ${toMegabytes(MAX_UPLOAD_BYTES)} MB.`,
    unreadableFile: 'We couldn’t read this video. Please choose it again.',
    unreadableMetadata: 'Could not read the video. Please try a different file.',
    tooLong: `Video must be ${MAX_DURATION_S} seconds or shorter.`,
} as const
