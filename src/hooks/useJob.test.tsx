import { getJob } from '@/api/jobs'
import type { AuthContextValue } from '@/auth/AuthContext'
import { memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { act, screen } from '@testing-library/react'
import { type Job, JobStatus } from 'adlens-shared'
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
    const { job } = useJob(JOB_ID)

    return <p>{job ? job.status : 'loading'}</p>
}

const renderJob = async (job: Job) => {
    mockUseAuth.mockReturnValue(memberAuth())
    jest.mocked(getJob).mockResolvedValue(job)
    renderWithProviders(<Probe />)
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
})
