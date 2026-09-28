import type { Sample, VideoMimeType } from 'adlens-shared'

export type AnalysisSource =
    | { kind: 'file'; file: File; contentType: VideoMimeType; url: string; width?: number; height?: number }
    | { kind: 'sample'; sample: Sample }
