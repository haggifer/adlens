import { RESTART_CLOCK_MS } from '@/job-status'
import { buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { act, screen } from '@testing-library/react'
import { JOB_START_WINDOW_MS, JobErrorCode, JobStatus } from 'adlens-shared'
import { JobStatusPanel } from './JobStatusPanel'

const RUNNING_STEPS = [JobStatus.Verifying, JobStatus.Queued, JobStatus.Analyzing]

const DISCONNECTED_COPY = 'Can’t reach AdLens right now. This page updates once it’s back.'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('./RestartJobButton', () => ({ RestartJobButton: () => <button type="button">Restart analysis</button> }))

const buildFailedJob = (overrides = {}) =>
    buildJob({ status: JobStatus.Error, createdAt: new Date().toISOString(), ...overrides })

const getActionNames = () => screen.getAllByRole('button').map((button) => button.textContent)

describe('JobStatusPanel', () => {
    it.each(RUNNING_STEPS)('animates the running step while %s', (status) => {
        renderWithProviders(<JobStatusPanel job={buildJob({ status })} />)

        const animation = screen.getByRole('img', { name: 'notification', hidden: true })
        const steps = [...document.querySelectorAll('.ant-steps-item')]

        expect(steps.findIndex((step) => step.contains(animation))).toBe(RUNNING_STEPS.indexOf(status))
    })

    it('marks the finished steps with a solid circle, and only them', () => {
        renderWithProviders(<JobStatusPanel job={buildJob({ status: JobStatus.Analyzing })} />)

        const icons = [...document.querySelectorAll<HTMLElement>('.ant-steps-item-icon')]

        expect(icons.map((icon) => icon.style.background !== '')).toEqual([true, true, false])
    })

    it('says when it can’t reach AdLens, so a stalled step isn’t taken for a slow one', () => {
        const job = buildJob({ status: JobStatus.Queued })
        const { rerender } = renderWithProviders(<JobStatusPanel job={job} isDisconnected />)

        expect(screen.getByText(DISCONNECTED_COPY)).toBeInTheDocument()

        rerender(<JobStatusPanel job={job} isDisconnected={false} />)

        expect(screen.queryByText(DISCONNECTED_COPY)).not.toBeInTheDocument()
    })

    describe('a failed run', () => {
        it('offers a restart on the right, after a new analysis, whatever the failure', () => {
            for (const errorCode of Object.values(JobErrorCode)) {
                const { unmount } = renderWithProviders(<JobStatusPanel job={buildFailedJob({ errorCode })} />)

                expect(getActionNames()).toEqual(['Analyze another video', 'Restart analysis'])
                expect(screen.getByRole('button', { name: 'Analyze another video' })).not.toHaveClass('ant-btn-primary')
                unmount()
            }
        })

        it.each([
            ['is past the start window', { createdAt: new Date(Date.now() - JOB_START_WINDOW_MS).toISOString() }],
            ['was restarted already', { restartedAs: 'job-2' }],
        ])('offers only a new analysis once the run %s', (_case, overrides) => {
            renderWithProviders(<JobStatusPanel job={buildFailedJob(overrides)} />)

            expect(getActionNames()).toEqual(['Analyze another video'])
            expect(screen.getByRole('button', { name: 'Analyze another video' })).toHaveClass('ant-btn-primary')
        })

        it('stops offering the restart once the start window passes while the page is open', async () => {
            jest.useFakeTimers()

            try {
                const createdAt = new Date(Date.now() - JOB_START_WINDOW_MS + 1000).toISOString()

                renderWithProviders(<JobStatusPanel job={buildFailedJob({ createdAt })} />)

                expect(getActionNames()).toContain('Restart analysis')

                await act(async () => jest.advanceTimersByTimeAsync(RESTART_CLOCK_MS))

                expect(getActionNames()).not.toContain('Restart analysis')
            } finally {
                jest.useRealTimers()
            }
        })
    })
})
