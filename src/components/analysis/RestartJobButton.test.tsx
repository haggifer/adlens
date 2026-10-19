import { ApiRequestError, describeRequestError } from '@/api/errors'
import { restartJob } from '@/api/jobs'
import { jobKey } from '@/hooks/useJob'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { screen, waitFor } from '@testing-library/react'
import { type Job, JobStatus, RequestErrorCode } from 'adlens-shared'
import { RestartJobButton } from './RestartJobButton'

const mockAuth = memberAuth()
const mockPush = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockAuth }))
jest.mock('@/api/jobs', () => ({ restartJob: jest.fn() }))

const FAILED = buildJob({ id: 'job-1', status: JobStatus.Error })
const RESTARTED = buildJob({ id: 'job-2', status: JobStatus.Queued })

const restartButton = () => screen.getByRole('button', { name: /restart analysis/i })

describe('RestartJobButton', () => {
    beforeEach(() => {
        jest.mocked(restartJob).mockReset()
        mockPush.mockClear()
    })

    it('stays on the page, loading, until the new run has started, then opens it', async () => {
        const queryClient = createTestQueryClient()
        let answer!: (job: Job) => void

        jest.mocked(restartJob).mockReturnValueOnce(new Promise<Job>((resolve) => (answer = resolve)))
        const { user } = renderWithProviders(<RestartJobButton job={FAILED} />, queryClient)

        await user.click(restartButton())

        expect(restartJob).toHaveBeenCalledWith(FAILED.id)
        await waitFor(() => expect(restartButton()).toHaveClass('ant-btn-loading'))
        expect(mockPush).not.toHaveBeenCalled()

        answer(RESTARTED)

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${RESTARTED.id}`))
        expect(queryClient.getQueryData(jobKey(MEMBER_USER.id, RESTARTED.id))).toEqual(RESTARTED)
    })

    it('says so and stays when the restart is refused, its video gone', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const failure = new ApiRequestError(RequestErrorCode.JobNotRestartable)

        jest.mocked(restartJob).mockRejectedValueOnce(failure)
        const { user } = renderWithProviders(<RestartJobButton job={FAILED} isIconOnly />)

        await user.click(restartButton())

        expect(await screen.findByText(describeRequestError(RequestErrorCode.JobNotRestartable))).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledWith(failure)
        consoleError.mockRestore()
    })
})
