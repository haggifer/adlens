import { screen, waitFor, within } from '@testing-library/react'
import { type Job, type JobListResponse, RequestErrorCode } from 'adlens-shared'
import type { AuthContextValue } from '@/auth/AuthContext'
import { ApiRequestError } from '@/api/errors'
import { listJobs } from '@/api/jobs'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { HistoryTable } from './HistoryTable'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/jobs', () => ({ deleteJob: jest.fn(async () => undefined), listJobs: jest.fn() }))

const JOB = buildJob()

const withFileName = (id: string, name: string) => buildJob({ id, file: { ...JOB.file, name } })

const page = (jobs: Job[], nextCursor: string | null = null): JobListResponse => ({ jobs, nextCursor })

const renderTable = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<HistoryTable />)
}

// While loading, antd shows the empty state under a spinner that blocks clicks.
const waitForLoaded = () =>
    waitFor(() => expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false'))

const rowOf = (fileName: string) => screen.findByRole('row', { name: new RegExp(fileName) })

describe('HistoryTable', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(listJobs).mockResolvedValue(page([JOB]))
    })

    it('tags an analysis of a sample ad', async () => {
        jest.mocked(listJobs).mockResolvedValue(page([buildJob({ sampleId: 'sample-1' })]))
        renderTable()

        expect(within(await rowOf(JOB.file.name)).getByText('Sample')).toBeInTheDocument()
    })

    it('opens the analysis when anywhere on its row is clicked', async () => {
        const { user } = renderTable()

        await user.click(within(await rowOf(JOB.file.name)).getAllByText('Done')[0])

        expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`)
    })

    it('does not open the analysis when its Delete button is clicked', async () => {
        const { user } = renderTable()

        await user.click(within(await rowOf(JOB.file.name)).getByRole('button', { name: /delete analysis/i }))

        expect(mockPush).not.toHaveBeenCalled()
    })

    it('loads the next page on request and appends it', async () => {
        jest.mocked(listJobs)
            .mockResolvedValueOnce(page([JOB], 'cursor-2'))
            .mockResolvedValueOnce(page([withFileName('job-2', 'older-ad.mp4')]))
        const { user } = renderTable()

        await user.click(await screen.findByRole('button', { name: 'Load more' }))

        expect(await screen.findByText('older-ad.mp4')).toBeInTheDocument()
        expect(screen.getByText(JOB.file.name)).toBeInTheDocument()
        expect(listJobs).toHaveBeenLastCalledWith('cursor-2')
        expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    })

    it('invites a user without analyses to check their first ad', async () => {
        jest.mocked(listJobs).mockResolvedValue(page([]))
        const { user } = renderTable()

        expect(await screen.findByText('No analyses yet')).toBeInTheDocument()
        await waitForLoaded()

        await user.click(screen.getByRole('button', { name: 'Check your first ad' }))

        expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('shows the copy for a failed load, not the server’s message', async () => {
        jest.mocked(listJobs).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
        renderTable()

        expect(await screen.findByText('AdLens is briefly unavailable. Please try again.')).toBeInTheDocument()
    })

    it('never shows one user’s analyses to the next user of the same browser', async () => {
        const nextUser = { ...MEMBER_USER, id: 'member-2', email: 'bob@example.com', name: 'Bob' }

        jest.mocked(listJobs)
            .mockResolvedValueOnce(page([JOB]))
            .mockResolvedValueOnce(page([withFileName('job-9', 'bob-ad.mp4')]))
        const { rerender } = renderTable()

        expect(await screen.findByText(JOB.file.name)).toBeInTheDocument()

        mockUseAuth.mockReturnValue({ ...memberAuth(), user: nextUser })
        rerender(<HistoryTable />)

        expect(await screen.findByText('bob-ad.mp4')).toBeInTheDocument()
        expect(screen.queryByText(JOB.file.name)).not.toBeInTheDocument()
    })
})
