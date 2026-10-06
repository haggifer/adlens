import { formatPlacementLabel } from '@/labels'
import { buildAnalysis, buildCheck, buildFinding } from '@/test/fixtures'
import { type Analysis, type Finding, type MetadataCheck, Placement } from 'adlens-shared'
import {
    countIssues,
    describeCheck,
    findingSeverity,
    formatCount,
    formatSeconds,
    formatTimeRange,
    splitResults,
} from './results'

const analysis = (findings: Finding[], metadataChecks: MetadataCheck[]): Analysis =>
    buildAnalysis({ findings, metadataChecks })

const ids = (items: { id: string }[]) => items.map((item) => item.id)

describe('splitResults', () => {
    it('splits findings by scope, most severe first', () => {
        const { compliance, bestPractice } = splitResults(
            analysis(
                [
                    buildFinding({ id: 'claims-info', severity: 'info' }),
                    buildFinding({ id: 'hook', scope: 'best_practice', severity: 'warning' }),
                    buildFinding({ id: 'claims-blocker', severity: 'blocker' }),
                    buildFinding({ id: 'captions', scope: 'best_practice', severity: 'blocker' }),
                    buildFinding({ id: 'claims-warning', severity: 'warning' }),
                ],
                [],
            ),
        )

        expect(ids(compliance)).toEqual(['claims-blocker', 'claims-warning', 'claims-info'])
        expect(ids(bestPractice)).toEqual(['captions', 'hook'])
    })

    it('lists only the specs that failed or couldn’t be measured', () => {
        const { placementIssues } = splitResults(
            analysis(
                [],
                [
                    buildCheck({ id: 'ratio', severity: 'warning', verdict: 'unknown' }),
                    buildCheck({ id: 'size', verdict: 'pass' }),
                    buildCheck({ id: 'duration', severity: 'blocker', verdict: 'fail' }),
                    buildCheck({ id: 'audio', verdict: 'pass' }),
                ],
            ),
        )

        expect(ids(placementIssues)).toEqual(['duration', 'ratio'])
    })
})

describe('findingSeverity', () => {
    it('keeps the rule’s severity when the model is sure the ad breaks it', () => {
        expect(findingSeverity(buildFinding({ severity: 'blocker', verdict: 'fail' }))).toBe('blocker')
        expect(findingSeverity(buildFinding({ severity: 'info', verdict: 'fail' }))).toBe('info')
    })

    it('never makes a probable or uncertain issue a blocker', () => {
        expect(findingSeverity(buildFinding({ severity: 'blocker', verdict: 'warning' }))).toBe('warning')
        expect(findingSeverity(buildFinding({ severity: 'blocker', verdict: 'unknown' }))).toBe('warning')
        expect(findingSeverity(buildFinding({ severity: 'info', verdict: 'warning' }))).toBe('info')
    })
})

describe('countIssues', () => {
    it('counts a probable or uncertain issue on a blocker rule as a warning', () => {
        const counts = countIssues(
            analysis(
                [
                    buildFinding({ severity: 'blocker', verdict: 'fail' }),
                    buildFinding({ severity: 'blocker', verdict: 'warning' }),
                    buildFinding({ severity: 'blocker', verdict: 'unknown' }),
                ],
                [],
            ),
        )

        expect(counts).toEqual({ blockers: 1, warnings: 2 })
    })

    it('counts blocker and warning findings, but not info ones', () => {
        const counts = countIssues(
            analysis(
                [
                    buildFinding({ severity: 'blocker' }),
                    buildFinding({ severity: 'warning', verdict: 'warning' }),
                    buildFinding({ severity: 'info' }),
                ],
                [],
            ),
        )

        expect(counts).toEqual({ blockers: 1, warnings: 1 })
    })

    it('counts a spec only once it has failed, not when it passed or couldn’t be measured', () => {
        const counts = countIssues(
            analysis(
                [],
                [
                    buildCheck({ severity: 'blocker', verdict: 'fail' }),
                    buildCheck({ severity: 'blocker', verdict: 'unknown' }),
                    buildCheck({ severity: 'warning', verdict: 'pass' }),
                ],
            ),
        )

        expect(counts).toEqual({ blockers: 1, warnings: 0 })
    })
})

describe('formatCount', () => {
    it('uses the singular for exactly one', () => {
        expect(formatCount(1, 'blocker', 'blockers')).toBe('1 blocker')
    })

    it('uses the plural otherwise', () => {
        expect(formatCount(0, 'blocker', 'blockers')).toBe('0 blockers')
        expect(formatCount(3, 'warning', 'warnings')).toBe('3 warnings')
    })
})

describe('formatSeconds', () => {
    it('shows minutes and zero-padded seconds, dropping the fraction', () => {
        expect(formatSeconds(0)).toBe('0:00')
        expect(formatSeconds(12.9)).toBe('0:12')
        expect(formatSeconds(59.99)).toBe('0:59')
        expect(formatSeconds(60)).toBe('1:00')
        expect(formatSeconds(75)).toBe('1:15')
    })
})

describe('formatTimeRange', () => {
    it('shows a range when the finding ends after it starts', () => {
        expect(formatTimeRange({ startS: 12.4, endS: 15 })).toBe('0:12–0:15')
    })

    it('shows only the start for a moment, or an end that isn’t after the start', () => {
        expect(formatTimeRange({ startS: 3 })).toBe('0:03')
        expect(formatTimeRange({ startS: 3, endS: 3 })).toBe('0:03')
        expect(formatTimeRange({ startS: 5, endS: 2 })).toBe('0:05')
    })
})

describe('describeCheck', () => {
    const DETAIL = 'It’s 30.4 seconds long, longer than the 6 seconds allowed.'

    it('says which placement a failed spec rules the video out of, then why', () => {
        expect(describeCheck(buildCheck({ placements: [Placement.YouTubeBumper], detail: DETAIL }))).toBe(
            `This video won’t work for ${formatPlacementLabel(Placement.YouTubeBumper)}. ${DETAIL}`,
        )
    })

    it('keeps the detail alone for a passed or unmeasured spec, a platform-wide one, or an older result', () => {
        const bumper = { placements: [Placement.YouTubeBumper], detail: DETAIL }

        expect(describeCheck(buildCheck({ ...bumper, verdict: 'pass' }))).toBe(DETAIL)
        expect(describeCheck(buildCheck({ ...bumper, verdict: 'unknown' }))).toBe(DETAIL)
        expect(describeCheck(buildCheck({ placements: [], detail: DETAIL }))).toBe(DETAIL)
        expect(describeCheck(buildCheck({ detail: DETAIL }))).toBe(DETAIL)
    })
})
