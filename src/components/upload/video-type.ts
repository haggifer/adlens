import { VideoMimeType, videoMimeTypeSchema } from 'adlens-shared'

// Types browsers report for files Gemini reads under another name: an .m4v is an MP4 container.
const MIME_ALIASES: Record<string, VideoMimeType> = {
    'video/x-m4v': VideoMimeType.Mp4,
}

const EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.3gp']

export const VIDEO_FILE_ACCEPT = [...Object.values(VideoMimeType), ...Object.keys(MIME_ALIASES), ...EXTENSIONS].join(
    ',',
)

// The type the upload is declared, signed and later sent to Gemini with; null when the format isn't supported.
export const toVideoMimeType = (browserType: string): VideoMimeType | null => {
    const parsed = videoMimeTypeSchema.safeParse(browserType)

    return parsed.success ? parsed.data : (MIME_ALIASES[browserType] ?? null)
}
