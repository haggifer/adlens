import type { CSSProperties } from 'react'

// The MIME types Vidstack recognises as video. Neither a blob: object URL nor a signed GCS URL has a file extension,
// so Vidstack relies entirely on this type to pick the native video provider — anything it doesn't list is never
// loaded and the player spins forever. So map other types onto a recognised one (the browser still sniffs the real
// codec when the <source> is attached).
const VIDSTACK_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/3gp', 'video/ogg', 'video/avi', 'video/mpeg'] as const

type VidstackVideoType = (typeof VIDSTACK_VIDEO_TYPES)[number]

export const toVidstackType = (mime: string): VidstackVideoType =>
    (VIDSTACK_VIDEO_TYPES as readonly string[]).includes(mime) ? (mime as VidstackVideoType) : 'video/mp4'

// Vidstack sizes the player at 16:9 whatever the media, which crops portrait ads once the layout sizes the player by
// width. Players set this ratio as --media-ratio on stacked layouts instead.
export const toMediaRatioStyle = (width?: number, height?: number): CSSProperties | undefined =>
    width && height ? ({ '--media-ratio': `${width} / ${height}` } as CSSProperties) : undefined
