import type { Analysis, Finding, MetadataCheck, Severity, TimeRange } from 'adlens-shared'

const SEVERITY_ORDER: Record<Severity, number> = { blocker: 0, warning: 1, info: 2 }

export const bySeverity = (a: { severity: Severity }, b: { severity: Severity }) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]

// A rule's severity says what a sure violation costs; the verdict says whether the model is sure. Only a `fail` on a
// blocker rule blocks the ad: a probable (`warning`) or uncertain (`unknown`) issue is at most a warning, so a concern
// without proof never reads as a rejection.
export const findingSeverity = ({ severity, verdict }: Finding): Severity =>
    verdict === 'fail' || severity !== 'blocker' ? severity : 'warning'

const byFindingSeverity = (a: Finding, b: Finding) =>
    SEVERITY_ORDER[findingSeverity(a)] - SEVERITY_ORDER[findingSeverity(b)]

export interface ResultSections {
    compliance: Finding[]
    bestPractice: Finding[]
    // Specs that failed or couldn't be measured; passing ones are only counted.
    placementIssues: MetadataCheck[]
    passedChecks: number
}

export const splitResults = ({ findings, metadataChecks }: Analysis): ResultSections => ({
    compliance: findings.filter((f) => f.scope === 'compliance').sort(byFindingSeverity),
    bestPractice: findings.filter((f) => f.scope === 'best_practice').sort(byFindingSeverity),
    placementIssues: metadataChecks.filter((c) => c.verdict !== 'pass').sort(bySeverity),
    passedChecks: metadataChecks.filter((c) => c.verdict === 'pass').length,
})

export interface IssueCounts {
    blockers: number
    warnings: number
}

// A spec check only counts once it has actually failed: `unknown` means it couldn't be measured.
export const countIssues = ({ findings, metadataChecks }: Analysis): IssueCounts => {
    const severities = [
        ...findings.map(findingSeverity),
        ...metadataChecks.filter((check) => check.verdict === 'fail').map((check) => check.severity),
    ]

    return {
        blockers: severities.filter((severity) => severity === 'blocker').length,
        warnings: severities.filter((severity) => severity === 'warning').length,
    }
}

export const formatCount = (count: number, singular: string, plural: string): string =>
    `${count} ${count === 1 ? singular : plural}`

export const formatSeconds = (totalSeconds: number): string => {
    const seconds = Math.floor(totalSeconds)

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export const formatTimeRange = ({ startS, endS }: TimeRange): string =>
    endS !== undefined && endS > startS ? `${formatSeconds(startS)}–${formatSeconds(endS)}` : formatSeconds(startS)
