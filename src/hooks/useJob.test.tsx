import { ApiRequestError } from '@/api/errors'
import { getJob } from '@/api/jobs'
import type { AuthContextValue } from '@/auth/AuthContext'
import { useLiveStore } from '@/contexts/stores/liveStore'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import type { QueryClient } from '@tanstack/react-query'
import { act, screen } from '@testing-library/react'
import { type Job, JobStatus, RequestErrorCode } from 'adlens-shared'
import { jobKey, useJob } from './useJob'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/jobs', () => ({ getJob: jest.fn() }))
const JOB_ID = 'job-1'

const Probe = () => {
    const { job, isDisconnected } = useJob(JOB_ID)

    return (
        <>
            <p>{job ? job.status : 'loading'}</p>
            {isDisconnected && <p>disconnected</p>}
        </>
    )
}

const renderJob = async (job: Job, queryClient = createTestQueryClient()) => {
    mockUseAuth.mockReturnValue(memberAuth())
    jest.mocked(getJob).mockResolvedValue(job)
    renderWithProviders(<Probe />, queryClient)
    await screen.findByText(job.status)

    return queryClient
}

// What useLiveUpdates does when the API announces a change to the job.
const announceChange = async (queryClient: QueryClient, job: Job) => {
    jest.mocked(getJob).mockResolvedValue(job)
    await act(async () => queryClient.invalidateQueries({ queryKey: ['job'] }))
}

describe('useJob', () => {
    beforeEach(() => {
        jest.mocked(getJob).mockReset()
        useLiveStore.setState({ isConnectionLost: false })
    })

    it('shows the change the API announced', async () => {
        const queryClient = await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Analyzing }))

        await announceChange(queryClient, buildJob({ id: JOB_ID, status: JobStatus.Analyzed }))

        expect(await screen.findByText(JobStatus.Analyzed)).toBeInTheDocument()
    })

    it('tells when the live connection is lost while the job runs, until it is back', async () => {
        await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Queued }))

        expect(screen.queryByText('disconnected')).not.toBeInTheDocument()

        act(() => useLiveStore.setState({ isConnectionLost: true }))

        expect(screen.getByText('disconnected')).toBeInTheDocument()

        act(() => useLiveStore.setState({ isConnectionLost: false }))

        expect(screen.queryByText('disconnected')).not.toBeInTheDocument()
    })

    it.each([JobStatus.Analyzed, JobStatus.Error])(
        "doesn't warn about a lost connection for a %s job, which will not change any more",
        async (status) => {
            useLiveStore.setState({ isConnectionLost: true })
            await renderJob(buildJob({ id: JOB_ID, status }))

            expect(screen.queryByText('disconnected')).not.toBeInTheDocument()
        },
    )

    it('asks for a running job every 10 seconds, so an abandoned one ends within 10 seconds of expiring', async () => {
        jest.useFakeTimers({ advanceTimers: true })

        try {
            await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Queued }))

            expect(getJob).toHaveBeenCalledTimes(1)

            await act(async () => jest.advanceTimersByTimeAsync(10_000))

            expect(getJob).toHaveBeenCalledTimes(2)

            jest.mocked(getJob).mockResolvedValue(buildJob({ id: JOB_ID, status: JobStatus.Error }))
            await act(async () => jest.advanceTimersByTimeAsync(10_000))
            await act(async () => jest.advanceTimersByTimeAsync(30_000))

            expect(getJob).toHaveBeenCalledTimes(3)
        } finally {
            jest.useRealTimers()
        }
    })

    it('counts a failed read of a running job as a lost connection, keeping the job', async () => {
        jest.useFakeTimers({ advanceTimers: true })

        try {
            await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Queued }))

            jest.mocked(getJob).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
            await act(async () => jest.advanceTimersByTimeAsync(10_000))

            expect(screen.getByText('disconnected')).toBeInTheDocument()
            expect(screen.getByText(JobStatus.Queued)).toBeInTheDocument()
        } finally {
            jest.useRealTimers()
        }
    })

    it('refreshes the quota and admission when a watched job fails, and again once the refund has landed', async () => {
        jest.useFakeTimers({ advanceTimers: true })

        try {
            const queryClient = createTestQueryClient()
            const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

            await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Analyzing }), queryClient)
            await announceChange(queryClient, buildJob({ id: JOB_ID, status: JobStatus.Error }))
            await screen.findByText(JobStatus.Error)

            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['quota'] })
            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admission'] })

            invalidate.mockClear()
            await act(async () => jest.advanceTimersByTimeAsync(2_000))

            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['quota'] })
            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admission'] })
        } finally {
            jest.useRealTimers()
        }
    })

    it('refreshes nothing for a job that had already failed when the page opened', async () => {
        const queryClient = createTestQueryClient()
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

        await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Error }), queryClient)

        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['quota'] })
    })

    it('keeps a newer job when an older read answers after it', async () => {
        jest.useFakeTimers({ advanceTimers: true })

        try {
            const queryClient = await renderJob(
                buildJob({ id: JOB_ID, status: JobStatus.Queued, updatedAt: '2026-10-09T10:00:00.000Z' }),
            )

            let answerRead!: (job: Job) => void

            jest.mocked(getJob).mockReturnValueOnce(new Promise<Job>((resolve) => (answerRead = resolve)))
            await act(async () => jest.advanceTimersByTimeAsync(10_000))
            act(() =>
                queryClient.setQueryData(
                    jobKey(MEMBER_USER.id, JOB_ID),
                    buildJob({ id: JOB_ID, status: JobStatus.Analyzing, updatedAt: '2026-10-09T10:00:20.000Z' }),
                ),
            )
            await act(async () =>
                answerRead(buildJob({ id: JOB_ID, status: JobStatus.Queued, updatedAt: '2026-10-09T10:00:10.000Z' })),
            )
            // The query cache tells the page on a timer, which the fake clock holds back.
            await act(async () => jest.advanceTimersByTimeAsync(100))

            expect(screen.getByText(JobStatus.Analyzing)).toBeInTheDocument()
        } finally {
            jest.useRealTimers()
        }
    })
})
