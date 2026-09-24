import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type Analysis, type Finding, type MetadataCheck, RulePlatform } from 'adlens-shared'
import ResultsPanel from './ResultsPanel'

const finding = (overrides: Partial<Finding>): Finding => ({
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

const check = (overrides: Partial<MetadataCheck>): MetadataCheck => ({
    id: 'spec',
    topic: 'Spec',
    severity: 'blocker',
    verdict: 'fail',
    detail: 'Detail',
    quote: 'Quote',
    ref: 'https://example.com/spec',
    ...overrides,
})

const ANALYSIS: Analysis = {
    model: 'gemini',
    promptVersion: '2',
    rulesetVersion: '1.1.0',
    transcript: 'Buy now',
    findings: [
        finding({ id: 'claims', topic: 'Misleading claims', severity: 'blocker', time: { startS: 12.4, endS: 15 } }),
        finding({ id: 'hook', topic: 'Weak hook', scope: 'best_practice', time: { startS: 0 } }),
    ],
    metadataChecks: [
        check({ id: 'duration', topic: 'Bumper duration' }),
        check({ id: 'ratio', topic: 'Aspect ratio', verdict: 'unknown' }),
        check({ id: 'size', topic: 'File size', verdict: 'pass' }),
    ],
    advisories: [],
    completedAt: '2026-09-23T10:00:00.000Z',
}

describe('ResultsPanel', () => {
    it('groups findings into approval, best-practice and placement sections', () => {
        render(<ResultsPanel analysis={ANALYSIS} />)

        expect(screen.getByText('Will it be approved?')).toBeInTheDocument()
        expect(screen.getByText('Misleading claims')).toBeInTheDocument()
        expect(screen.getByText('What’s holding it back?')).toBeInTheDocument()
        expect(screen.getByText('Weak hook')).toBeInTheDocument()
        expect(screen.getByText('Bumper duration')).toBeInTheDocument()
        expect(screen.getByText('Aspect ratio')).toBeInTheDocument()
        expect(screen.queryByText('File size')).not.toBeInTheDocument()
        expect(screen.getByText('1 spec passes.')).toBeInTheDocument()
    })

    it('counts failed spec blockers but not specs that could not be checked', () => {
        render(<ResultsPanel analysis={ANALYSIS} />)

        expect(screen.getByText('2 blockers')).toBeInTheDocument()
        expect(screen.getByText('1 warning')).toBeInTheDocument()
    })

    it('seeks the video to the start of a finding when its timestamp is clicked', async () => {
        const onSeek = jest.fn()

        render(<ResultsPanel analysis={ANALYSIS} onSeek={onSeek} />)
        await userEvent.click(screen.getByRole('button', { name: 'Play from 0:12–0:15' }))

        expect(onSeek).toHaveBeenCalledWith(12.4)
    })
})
