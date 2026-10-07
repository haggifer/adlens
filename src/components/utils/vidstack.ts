import type { CSSProperties } from 'react'

// Vidstack sizes the player at 16:9 whatever the media, which crops portrait ads once the layout sizes the player by
// width. Players set this ratio as --media-ratio on stacked layouts instead.
export const toMediaRatioStyle = (width?: number, height?: number): CSSProperties | undefined =>
    width && height ? ({ '--media-ratio': `${width} / ${height}` } as CSSProperties) : undefined
