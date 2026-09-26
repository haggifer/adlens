import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type Job, JobStatus, VideoMimeType } from 'adlens-shared'
import { App } from 'antd'
import HistoryTable from './HistoryTable'

const push = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
jest.mock('@/hooks/useJobs', () => () => ({
    jobs: [JOB],
    isLoading: false,
    error: null,
    hasMore: false,
    isLoadingMore: false,
    loadMore: jest.fn(),
}))

const JOB: Job = {
    id: 'j1',
    status: JobStatus.Analyzed,
    settings: { platforms: [], placements: [], markets: [] },
    file: { name: 'summer-ad.mp4', contentType: VideoMimeType.Mp4, size: 1000 },
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:00.000Z',
}

const renderTable = () =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <App>
                <HistoryTable />
            </App>
        </QueryClientProvider>,
    )

describe('HistoryTable', () => {
    beforeEach(() => push.mockClear())

    it('opens the analysis when anywhere on its row is clicked', async () => {
        renderTable()

        await userEvent.click(screen.getAllByText('Done')[0])

        expect(push).toHaveBeenCalledWith('/analyses/j1')
    })

    it('does not open the analysis when its Delete button is clicked', async () => {
        renderTable()

        await userEvent.click(screen.getByRole('button', { name: /delete analysis/i }))

        expect(push).not.toHaveBeenCalled()
    })
})
