import { ApiRequestError } from '@/api/errors'
import { getJob } from '@/api/jobs'
import type { AuthContextValue } from '@/auth/AuthContext'
import { memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { act, screen } from '@testing-library/react'
import { type Job, JobStatus, RequestErrorCode } from 'adlens-shared'
import { useJob } from './useJob'

type SocketHandler = (payload?: unknown) => void

interface FakeSocket {
    handlers: Map<string, SocketHandler>
    on: jest.Mock
    disconnect: jest.Mock
}

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockSockets: FakeSocket[] = []

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/jobs', () => ({ getJob: jest.fn() }))
jest.mock('socket.io-client', () => ({
    io: jest.fn(() => {
        const socket: FakeSocket = {
            handlers: new Map(),
            on: jest.fn((event: string, handler: SocketHandler) => socket.handlers.set(event, handler)),
            disconnect: jest.fn(),
        }

        mockSockets.push(socket)

        return socket
    }),
}))

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
}

describe('useJob', () => {
    beforeEach(() => {
        mockSockets.length = 0
        jest.mocked(getJob).mockReset()
    })

    it.each([JobStatus.Analyzed, JobStatus.Error, JobStatus.Pending])(
        'opens no live connection for a %s job, which will not change any more',
        async (status) => {
            await renderJob(buildJob({ id: JOB_ID, status }))

            expect(mockSockets).toHaveLength(0)
        },
    )

    it('follows a running job live and disconnects once it finishes', async () => {
        await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Analyzing }))

        expect(mockSockets).toHaveLength(1)

        const [socket] = mockSockets

        act(() => socket.handlers.get('job:updated')?.(buildJob({ id: JOB_ID, status: JobStatus.Analyzed })))

        expect(await screen.findByText(JobStatus.Analyzed)).toBeInTheDocument()
        expect(socket.disconnect).toHaveBeenCalled()
        expect(mockSockets).toHaveLength(1)
    })

    it('tells when the live connection is lost, until it is back', async () => {
        await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Queued }))

        const [socket] = mockSockets

        expect(screen.queryByText('disconnected')).not.toBeInTheDocument()

        act(() => socket.handlers.get('connect_error')?.(new Error('websocket error')))

        expect(screen.getByText('disconnected')).toBeInTheDocument()

        act(() => socket.handlers.get('connect')?.())

        expect(screen.queryByText('disconnected')).not.toBeInTheDocument()
    })

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
            act(() => mockSockets[0].handlers.get('job:updated')?.(buildJob({ id: JOB_ID, status: JobStatus.Error })))
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

    it('doesn’t call a socket the API ended a lost connection, since the interval reads keep the page current', async () => {
        await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Queued }))

        const [socket] = mockSockets

        act(() => socket.handlers.get('disconnect')?.('io server disconnect'))

        expect(screen.queryByText('disconnected')).not.toBeInTheDocument()

        act(() => socket.handlers.get('disconnect')?.('transport close'))

        expect(screen.getByText('disconnected')).toBeInTheDocument()
    })

    it('keeps a pushed update when an older read answers after it', async () => {
        jest.useFakeTimers({ advanceTimers: true })

        try {
            await renderJob(buildJob({ id: JOB_ID, status: JobStatus.Queued, updatedAt: '2026-10-09T10:00:00.000Z' }))

            let answerRead!: (job: Job) => void

            jest.mocked(getJob).mockReturnValueOnce(new Promise<Job>((resolve) => (answerRead = resolve)))
            await act(async () => jest.advanceTimersByTimeAsync(10_000))
            act(() =>
                mockSockets[0].handlers.get('job:updated')?.(
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
