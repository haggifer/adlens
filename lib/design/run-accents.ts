// TEMPORARY — design harness only. Candidate accent treatments for the primary "Run Analysis" CTA, so we
// can compare ways to make it the most attention-drawing element on the page. The visual for each id lives
// in components/upload/styles.ts (the runButton class), keyed by the `data-accent` attribute.
export enum RunAccentId {
    Primary = 'primary',
    Gradient = 'gradient',
    Glow = 'glow',
    Shine = 'shine',
}

export interface RunAccentOption {
    id: RunAccentId
    name: string
}

export const RUN_ACCENTS: RunAccentOption[] = [
    { id: RunAccentId.Primary, name: 'Primary (flat)' },
    { id: RunAccentId.Gradient, name: 'Gradient + lift' },
    { id: RunAccentId.Glow, name: 'Pulsing glow' },
    { id: RunAccentId.Shine, name: 'Gradient + shine' },
]

export const DEFAULT_RUN_ACCENT = RunAccentId.Gradient
