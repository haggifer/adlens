import {
    type Analysis,
    type Finding,
    type Job,
    JobStatus,
    type MetadataCheck,
    Platform,
    type Preset,
    RulePlatform,
    type Sample,
    VideoMimeType,
} from 'adlens-shared'

const CREATED_AT = '2026-09-24T10:00:00.000Z'

export const buildJob = (overrides: Partial<Job> = {}): Job => ({
    id: 'job-1',
    status: JobStatus.Analyzed,
    settings: { platforms: [], placements: [], markets: [] },
    file: { name: 'summer-ad.mp4', contentType: VideoMimeType.Mp4, size: 1000 },
    presetName: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
})

export const buildFinding = (overrides: Partial<Finding> = {}): Finding => ({
    id: 'rule',
    platform: [RulePlatform.Meta],
    topic: 'Topic',
    scope: 'compliance',
    severity: 'warning',
    verdict: 'fail',
    evidence: 'Evidence',
    quote: 'Quote',
    ref: 'https://example.com/policy',
    ...overrides,
})

export const buildCheck = (overrides: Partial<MetadataCheck> = {}): MetadataCheck => ({
    id: 'spec',
    topic: 'Spec',
    severity: 'blocker',
    verdict: 'fail',
    detail: 'Detail',
    quote: 'Quote',
    ref: 'https://example.com/spec',
    ...overrides,
})

export const buildAnalysis = (overrides: Partial<Analysis> = {}): Analysis => ({
    model: 'gemini',
    promptVersion: '2',
    rulesetVersion: '1.1.0',
    transcript: 'Buy now',
    findings: [],
    metadataChecks: [],
    advisories: [],
    completedAt: CREATED_AT,
    ...overrides,
})

export const buildSample = (overrides: Partial<Sample> = {}): Sample => ({
    id: 'sample-1',
    title: 'Running shoes',
    description: 'A 15-second product spot with a spoken offer',
    settings: { platforms: [Platform.Meta], placements: [], markets: [] },
    media: {
        durationS: 15,
        width: 1080,
        height: 1920,
        hasAudio: true,
        sizeBytes: 5000,
        contentType: VideoMimeType.Mp4,
    },
    contentType: VideoMimeType.Mp4,
    previewUrl: 'https://storage.googleapis.com/bucket/samples/sample-1.mp4?X-Goog-Signature=abc',
    ...overrides,
})

export const buildPreset = (overrides: Partial<Preset> = {}): Preset => ({
    id: 'preset-1',
    name: 'Stories',
    settings: { platforms: [Platform.Meta], placements: [], markets: [] },
    isDefault: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
})
