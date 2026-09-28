import type { Sample, VideoMimeType } from 'adlens-shared'

// What the workspace analyzes: a file the user picked, or one of the published sample ads.
export type AnalysisSource =
    | { kind: 'file'; file: File; contentType: VideoMimeType; url: string; width?: number; height?: number }
    | { kind: 'sample'; sample: Sample }
