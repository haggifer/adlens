import { formatPlacementLabel, RULE_PLATFORM_LABELS } from '@/labels'
import { buildAnalysis, buildCheck, buildFinding } from '@/test/fixtures'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Placement, RulePlatform } from 'adlens-shared'
import { ResultsPanel } from './ResultsPanel'

const APPROVAL_HEADING = 'Will it be approved?'
const BEST_PRACTICE_HEADING = 'What’s holding it back?'
const SPECS_HEADING = 'Placement specs'
const ADVISORIES_HEADING = 'Confirm in your campaign setup'

const ANALYSIS = buildAnalysis({
    findings: [
        buildFinding({
            id: 'claims',
            topic: 'Misleading claims',
            severity: 'blocker',
            time: { startS: 12.4, endS: 15 },
        }),
        buildFinding({ id: 'hook', topic: 'Weak hook', scope: 'best_practice', time: { startS: 0 } }),
    ],
    metadataChecks: [
        buildCheck({ id: 'duration', topic: 'Bumper duration' }),
        buildCheck({ id: 'ratio', topic: 'Aspect ratio', verdict: 'unknown' }),
        buildCheck({ id: 'size', topic: 'File size', verdict: 'pass' }),
    ],
})

const heading = (name: string) => screen.getByRole('heading', { name })

const isBefore = (first: HTMLElement, second: HTMLElement) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

// The sections are flat siblings, so a result belongs to the last heading rendered before it. The last section has
// no heading after it.
const expectBetween = (text: string, start: HTMLElement, end?: HTMLElement) => {
    const element = screen.getByText(text)

    expect(isBefore(start, element)).toBe(true)

    if (end) {
        expect(isBefore(element, end)).toBe(true)
    }
}

describe('ResultsPanel', () => {
    it('opens with the transcript, puts each finding under its section, and doesn’t list passed specs', () => {
        render(<ResultsPanel analysis={ANALYSIS} />)

        const transcript = screen.getByRole('button', { name: /Transcript/ })

        expect(isBefore(transcript, heading(APPROVAL_HEADING))).toBe(true)
        expectBetween('Misleading claims', heading(APPROVAL_HEADING), heading(BEST_PRACTICE_HEADING))
        expectBetween('Weak hook', heading(BEST_PRACTICE_HEADING), heading(SPECS_HEADING))
        expectBetween('Bumper duration', heading(SPECS_HEADING))
        expectBetween('Aspect ratio', heading(SPECS_HEADING))
        expect(screen.queryByText('File size')).not.toBeInTheDocument()
    })

    it('counts failed spec blockers but not specs that could not be checked', () => {
        render(<ResultsPanel analysis={ANALYSIS} />)

        expect(screen.getByText('2 blockers')).toBeInTheDocument()
        expect(screen.getByText('1 warning')).toBeInTheDocument()
        expect(screen.queryByText(/to confirm/)).not.toBeInTheDocument()
    })

    it('shows no count that is zero', () => {
        render(<ResultsPanel analysis={buildAnalysis()} />)

        expect(screen.queryByText(/blockers?$/)).not.toBeInTheDocument()
        expect(screen.queryByText(/warnings?$/)).not.toBeInTheDocument()
        expect(screen.queryByText(/to confirm$/)).not.toBeInTheDocument()
    })

    it('says so when a section has nothing to report, and leaves out the specs without placements', () => {
        render(<ResultsPanel analysis={buildAnalysis()} />)

        expect(screen.getByText('No policy risks found.')).toBeInTheDocument()
        expect(screen.getByText('No gaps against the platforms’ best practices.')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: SPECS_HEADING })).not.toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: ADVISORIES_HEADING })).not.toBeInTheDocument()
    })

    it('says no spec has an issue when every one passes', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    metadataChecks: [buildCheck({ verdict: 'pass' }), buildCheck({ id: 'other', verdict: 'pass' })],
                })}
            />,
        )

        expect(heading(SPECS_HEADING)).toBeInTheDocument()
        expect(screen.getByText('No placement spec issues found.')).toBeInTheDocument()
    })

    it('lists the rules to confirm in the campaign setup', () => {
        const analysis = buildAnalysis({
            advisories: [
                {
                    id: 'alcohol',
                    platform: [RulePlatform.Meta],
                    topic: 'Alcohol targeting',
                    severity: 'blocker',
                    check: 'Target only people of legal drinking age.',
                    quote: 'Quote',
                    ref: 'https://example.com/alcohol',
                },
            ],
        })

        render(<ResultsPanel analysis={analysis} />)

        expect(screen.getByText('1 to confirm')).toBeInTheDocument()
        expect(heading(ADVISORIES_HEADING)).toBeInTheDocument()
        expect(screen.getByText('Target only people of legal drinking age.')).toBeInTheDocument()
        expect(screen.getByText(RULE_PLATFORM_LABELS[RulePlatform.Meta])).toBeInTheDocument()
    })

    it('shows a probable issue on a blocker rule as a warning, not a blocker', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({ findings: [buildFinding({ severity: 'blocker', verdict: 'warning' })] })}
            />,
        )

        expect(screen.queryByText(/blockers?$/)).not.toBeInTheDocument()
        expect(screen.getByText('1 warning')).toBeInTheDocument()
        expect(screen.queryByText('blocker')).not.toBeInTheDocument()
    })

    it('labels each finding with how sure the AI is, and a spec only when it couldn’t be measured', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    findings: [
                        buildFinding({ id: 'sure', verdict: 'fail' }),
                        buildFinding({ id: 'probable', verdict: 'warning' }),
                        buildFinding({ id: 'unclear', verdict: 'unknown' }),
                    ],
                    metadataChecks: [
                        buildCheck({ id: 'measured' }),
                        buildCheck({ id: 'unmeasured', verdict: 'unknown' }),
                    ],
                })}
            />,
        )

        expect(screen.getByText('AI: sure')).toHaveClass('ant-tag')
        expect(screen.getByText('AI: likely')).toBeInTheDocument()
        expect(screen.getByText('AI: unsure')).toBeInTheDocument()
        expect(screen.getAllByText('couldn’t measure')).toHaveLength(1)
    })

    it('titles a finding and an advisory with their topic in words, not the rule id', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    findings: [buildFinding({ topic: 'deceptive:fake_ui' })],
                    advisories: [
                        {
                            id: 'music',
                            platform: [RulePlatform.Meta],
                            topic: 'ip:music_licensing',
                            severity: 'warning',
                            check: 'Secure the music licenses.',
                            quote: 'Quote',
                            ref: 'https://example.com/music',
                        },
                    ],
                })}
            />,
        )

        expect(screen.getByText('Deceptive: fake UI')).toBeInTheDocument()
        expect(screen.getByText('Intellectual property: music licensing')).toBeInTheDocument()
        expect(screen.queryByText('deceptive:fake_ui')).not.toBeInTheDocument()
    })

    it('links each finding to its source in a new tab', () => {
        render(<ResultsPanel analysis={buildAnalysis({ findings: [buildFinding()] })} />)

        const link = screen.getByRole('link', { name: /Source/ })

        expect(link).toHaveAttribute('href', 'https://example.com/policy')
        expect(link).toHaveAttribute('target', '_blank')
    })

    it('seeks the video to the start of a finding when its timestamp is clicked', async () => {
        const onSeek = jest.fn()

        render(<ResultsPanel analysis={ANALYSIS} onSeek={onSeek} />)
        await userEvent.click(screen.getByRole('button', { name: 'Play from 0:12–0:15' }))

        expect(onSeek).toHaveBeenCalledWith(12.4)
    })

    it('shows the transcript on request, or says there was no speech', async () => {
        render(<ResultsPanel analysis={buildAnalysis({ transcript: '' })} />)

        await userEvent.click(screen.getByRole('button', { name: /Transcript/ }))

        expect(await screen.findByText('No speech detected.')).toBeInTheDocument()
    })

    it('tags a failed placement spec with its placement and says the video won’t work there, and why', () => {
        const bumper = formatPlacementLabel(Placement.YouTubeBumper)

        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    metadataChecks: [
                        buildCheck({
                            id: 'bumper',
                            platform: [RulePlatform.YouTube],
                            placements: [Placement.YouTubeBumper],
                            topic: 'creative_spec:duration',
                            check: 'Bumper ads must be at most 6 seconds long.',
                            detail: 'It’s 30.4 seconds long, longer than the 6 seconds allowed.',
                        }),
                    ],
                })}
            />,
        )

        expect(screen.getByText(bumper)).toHaveClass('ant-tag')
        expect(screen.getByText('Bumper ads must be at most 6 seconds long.')).toBeInTheDocument()
        expect(
            screen.getByText(
                `This video won’t work for ${bumper}. It’s 30.4 seconds long, longer than the 6 seconds allowed.`,
            ),
        ).toBeInTheDocument()
        expect(screen.queryByText('creative_spec:duration')).not.toBeInTheDocument()
    })

    it('tags a failed platform-wide spec with its platform', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    metadataChecks: [
                        buildCheck({
                            platform: [RulePlatform.YouTube],
                            check: 'YouTube video ads need at least SD resolution.',
                        }),
                    ],
                })}
            />,
        )

        expect(screen.getByText(RULE_PLATFORM_LABELS[RulePlatform.YouTube])).toHaveClass('ant-tag')
    })

    it('shows a result stored before checks named their placements as it was', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    metadataChecks: [buildCheck({ topic: 'Bumper duration', detail: 'Duration 30.4s vs max 6s' })],
                })}
            />,
        )

        expect(screen.getByText('Bumper duration')).toBeInTheDocument()
        expect(screen.getByText('Duration 30.4s vs max 6s')).toBeInTheDocument()
    })
})
