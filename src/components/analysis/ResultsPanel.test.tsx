import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulePlatform } from 'adlens-shared'
import { buildAnalysis, buildCheck, buildFinding } from '@/test/fixtures'
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

// The sections are flat siblings, so a result belongs to the last heading rendered before it.
const expectBetween = (text: string, start: HTMLElement, end: HTMLElement) => {
    const element = screen.getByText(text)

    expect(start.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(element.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
}

describe('ResultsPanel', () => {
    it('puts each finding under its section, and lists only the specs that didn’t pass', () => {
        render(<ResultsPanel analysis={ANALYSIS} />)

        const passedSpecs = screen.getByText('1 spec passes.')

        expectBetween('Misleading claims', heading(APPROVAL_HEADING), heading(BEST_PRACTICE_HEADING))
        expectBetween('Weak hook', heading(BEST_PRACTICE_HEADING), heading(SPECS_HEADING))
        expectBetween('Bumper duration', heading(SPECS_HEADING), passedSpecs)
        expectBetween('Aspect ratio', heading(SPECS_HEADING), passedSpecs)
        expect(screen.queryByText('File size')).not.toBeInTheDocument()
    })

    it('counts failed spec blockers but not specs that could not be checked', () => {
        render(<ResultsPanel analysis={ANALYSIS} />)

        expect(screen.getByText('2 blockers')).toBeInTheDocument()
        expect(screen.getByText('1 warning')).toBeInTheDocument()
        expect(screen.getByText('0 to confirm')).toBeInTheDocument()
    })

    it('says so when a section has nothing to report, and leaves out the specs without placements', () => {
        render(<ResultsPanel analysis={buildAnalysis()} />)

        expect(screen.getByText('No policy risks found.')).toBeInTheDocument()
        expect(screen.getByText('No gaps against the platforms’ best practices.')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: SPECS_HEADING })).not.toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: ADVISORIES_HEADING })).not.toBeInTheDocument()
    })

    it('counts passing specs in the plural', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({
                    metadataChecks: [buildCheck({ verdict: 'pass' }), buildCheck({ id: 'other', verdict: 'pass' })],
                })}
            />,
        )

        expect(heading(SPECS_HEADING)).toBeInTheDocument()
        expect(screen.getByText('2 specs pass.')).toBeInTheDocument()
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
    })

    it('shows a probable issue on a blocker rule as a warning, not a blocker', () => {
        render(
            <ResultsPanel
                analysis={buildAnalysis({ findings: [buildFinding({ severity: 'blocker', verdict: 'warning' })] })}
            />,
        )

        expect(screen.getByText('0 blockers')).toBeInTheDocument()
        expect(screen.getByText('1 warning')).toBeInTheDocument()
        expect(screen.queryByText('blocker')).not.toBeInTheDocument()
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
})
