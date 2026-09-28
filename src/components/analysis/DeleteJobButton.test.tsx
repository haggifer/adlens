import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type Job, JobStatus, VideoMimeType } from 'adlens-shared'
import { App } from 'antd'
import { deleteJob } from '@/api/jobs'
import { DeleteJobButton } from './DeleteJobButton'

jest.mock('@/api/jobs', () => ({ deleteJob: jest.fn(async () => undefined) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))

const JOB: Job = {
    id: 'j1',
    status: JobStatus.Analyzed,
    settings: { platforms: [], placements: [], markets: [] },
    file: { name: 'ad.mp4', contentType: VideoMimeType.Mp4, size: 1000 },
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:00.000Z',
}

const renderButton = (job: Job, onDeleted = jest.fn()) => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <App>
                <DeleteJobButton job={job} onDeleted={onDeleted} />
            </App>
        </QueryClientProvider>,
    )

    return onDeleted
}

describe('DeleteJobButton', () => {
    beforeEach(() => jest.mocked(deleteJob).mockClear())

    it('deletes the analysis once the user confirms', async () => {
        const onDeleted = renderButton(JOB)

        await userEvent.click(screen.getByRole('button', { name: /delete analysis/i }))
        await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))

        await waitFor(() => expect(onDeleted).toHaveBeenCalled())
        expect(deleteJob).toHaveBeenCalledWith('j1')
    })

    it('does nothing when the user cancels', async () => {
        const onDeleted = renderButton(JOB)

        await userEvent.click(screen.getByRole('button', { name: /delete analysis/i }))
        await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

        expect(deleteJob).not.toHaveBeenCalled()
        expect(onDeleted).not.toHaveBeenCalled()
    })

    it('is disabled while the analysis runs', () => {
        renderButton({ ...JOB, status: JobStatus.Analyzing })

        expect(screen.getByRole('button', { name: /delete analysis/i })).toBeDisabled()
    })
})
