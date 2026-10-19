import { ApiRequestError, describeRequestError } from '@/api/errors'
import { restartJob } from '@/api/jobs'
import { jobKey } from '@/hooks/useJob'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { JOB_RESTART_WINDOW_MS, JobErrorCode, JobStatus, RequestErrorCode, RESTARTABLE_JOB_ERRORS } from 'adlens-shared'
import { JobStatusPanel } from './JobStatusPanel'

const RUNNING_STEPS = [JobStatus.Verifying, JobStatus.Queued, JobStatus.Analyzing]

const DISCONNECTED_COPY = 'Can’t reach AdLens right now. This page updates once it’s back.'

const mockAuth = memberAuth()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockAuth }))
jest.mock('@/api/jobs', () => ({ restartJob: jest.fn() }))

// Failed just now, for a reason a restart may fix.
const buildFailedJob = (overrides = {}) =>
    buildJob({
        status: JobStatus.Error,
        errorCode: RESTARTABLE_JOB_ERRORS[0],
        createdAt: new Date().toISOString(),
        ...overrides,
    })

const restartButton = () => screen.queryByRole('button', { name: 'Restart analysis' })

const newAnalysisButton = () => screen.getByRole('button', { name: 'Analyze another video' })

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
        beforeEach(() => jest.mocked(restartJob).mockReset())

        it('offers a restart as the main action, and shows the run in its first step while it starts', async () => {
            const job = buildFailedJob()
            const queryClient = createTestQueryClient()

            jest.mocked(restartJob).mockReturnValueOnce(new Promise(() => {}))
            queryClient.setQueryData(jobKey(MEMBER_USER.id, job.id), job)
            const { user } = renderWithProviders(<JobStatusPanel job={job} />, queryClient)

            expect(restartButton()).toHaveClass('ant-btn-primary')
            expect(newAnalysisButton()).not.toHaveClass('ant-btn-primary')

            await user.click(restartButton()!)

            expect(restartJob).toHaveBeenCalledWith(job.id)
            expect(queryClient.getQueryData(jobKey(MEMBER_USER.id, job.id))).toMatchObject({
                status: JobStatus.Verifying,
                errorCode: undefined,
            })
        })

        it.each([
            ['its video was rejected', { errorCode: JobErrorCode.VideoUnreadable }],
            ['its upload never arrived', { errorCode: JobErrorCode.UploadFailed }],
            ['its video may be gone', { createdAt: new Date(Date.now() - JOB_RESTART_WINDOW_MS).toISOString() }],
        ])('offers only a new analysis when %s', (_case, overrides) => {
            renderWithProviders(<JobStatusPanel job={buildFailedJob(overrides)} />)

            expect(restartButton()).not.toBeInTheDocument()
            expect(newAnalysisButton()).toHaveClass('ant-btn-primary')
        })

        it('shows why a restart was refused, and puts the failed run back', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            const failure = new ApiRequestError(RequestErrorCode.JobNotRestartable)
            const job = buildFailedJob()
            const queryClient = createTestQueryClient()

            jest.mocked(restartJob).mockRejectedValueOnce(failure)
            const { user } = renderWithProviders(<JobStatusPanel job={job} />, queryClient)

            await user.click(restartButton()!)

            expect(
                await screen.findByText(describeRequestError(RequestErrorCode.JobNotRestartable)),
            ).toBeInTheDocument()
            expect(queryClient.getQueryData(jobKey(MEMBER_USER.id, job.id))).toEqual(job)
            expect(consoleError).toHaveBeenCalledWith(failure)
            consoleError.mockRestore()
        })
    })
})
