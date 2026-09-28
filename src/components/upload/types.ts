import type { Sample, VideoMimeType } from 'adlens-shared'

export type AnalysisSource =
    | { kind: 'file'; file: File; contentType: VideoMimeType; url: string; width?: number; height?: number }
    | { kind: 'sample'; sample: Sample }

export interface SelectedVideo {
    url: string
    type: string
    width?: number
    height?: number
    // Set when the video is one of the published sample ads.
    sampleTitle?: string
}

export interface VideoMetadata {
    durationS: number
    width: number
    height: number
}

export interface AcceptedVideo extends VideoMetadata {
    contentType: VideoMimeType
}
