import { screen } from '@testing-library/react'
import { type Job, JobStatus, RequestErrorCode } from 'adlens-shared'
import { ApiRequestError } from '@/api/errors'
import { deleteJob } from '@/api/jobs'
import { jobKey } from '@/hooks/useJob'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { DeleteJobButton } from './DeleteJobButton'

const mockAuth = memberAuth()

jest.mock('@/api/jobs', () => ({ deleteJob: jest.fn(async () => undefined) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockAuth }))

const JOB = buildJob()

const JOBS_KEY = ['jobs', MEMBER_USER.id]

const renderButton = (job: Job, queryClient = createTestQueryClient()) => {
    const onDeleted = jest.fn()

    return { onDeleted, ...renderWithProviders(<DeleteJobButton job={job} onDeleted={onDeleted} />, queryClient) }
}

describe('DeleteJobButton', () => {
    beforeEach(() => jest.mocked(deleteJob).mockClear())

    afterEach(() => jest.restoreAllMocks())

    it('deletes the analysis once the user confirms, and refreshes their history', async () => {
        const queryClient = createTestQueryClient()

        queryClient.setQueryData(JOBS_KEY, { pages: [] })
        queryClient.setQueryData(jobKey(MEMBER_USER.id, JOB.id), JOB)
        const { user, onDeleted } = renderButton(JOB, queryClient)

        await user.click(screen.getByRole('button', { name: /delete analysis/i }))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        expect(await screen.findByText('Analysis deleted')).toBeInTheDocument()
        expect(deleteJob).toHaveBeenCalledWith(JOB.id)
        expect(onDeleted).toHaveBeenCalledTimes(1)
        expect(queryClient.getQueryState(JOBS_KEY)?.isInvalidated).toBe(true)
        expect(queryClient.getQueryData(jobKey(MEMBER_USER.id, JOB.id))).toBeUndefined()
    })

    it('does nothing when the user cancels', async () => {
        const { user, onDeleted } = renderButton(JOB)

        await user.click(screen.getByRole('button', { name: /delete analysis/i }))
        await user.click(await screen.findByRole('button', { name: 'Cancel' }))

        expect(deleteJob).not.toHaveBeenCalled()
        expect(onDeleted).not.toHaveBeenCalled()
    })

    it('warns that the uploaded video is deleted too', async () => {
        const { user } = renderButton(JOB)

        await user.click(screen.getByRole('button', { name: /delete analysis/i }))

        expect(await screen.findByText(/the uploaded video will be deleted permanently/)).toBeInTheDocument()
    })

    it('doesn’t mention a video for a sample, which isn’t the user’s to delete', async () => {
        const { user } = renderButton(buildJob({ sampleId: 'sample-1' }))

        await user.click(screen.getByRole('button', { name: /delete analysis/i }))

        expect(await screen.findByText('The analysis will be deleted permanently.')).toBeInTheDocument()
    })

    it('shows the API’s reason when the deletion fails, and keeps the analysis', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const failure = new ApiRequestError(RequestErrorCode.JobInProgress)

        jest.mocked(deleteJob).mockRejectedValueOnce(failure)
        const { user, onDeleted } = renderButton(JOB)

        await user.click(screen.getByRole('button', { name: /delete analysis/i }))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        expect(
            await screen.findByText('This analysis is still running. You can delete it once it finishes.'),
        ).toBeInTheDocument()
        expect(onDeleted).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledWith(failure)
    })

    it.each([JobStatus.Verifying, JobStatus.Queued, JobStatus.Analyzing])(
        'is disabled while the job is %s',
        (status) => {
            renderButton(buildJob({ status }))

            expect(screen.getByRole('button', { name: /delete analysis/i })).toBeDisabled()
        },
    )

    it.each([JobStatus.Pending, JobStatus.Analyzed, JobStatus.Error])('can delete a job that is %s', (status) => {
        renderButton(buildJob({ status }))

        expect(screen.getByRole('button', { name: /delete analysis/i })).toBeEnabled()
    })
})
