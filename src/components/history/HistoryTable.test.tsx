import { ApiRequestError, describeRequestError } from '@/api/errors'
import { listJobs } from '@/api/jobs'
import { listPresets } from '@/api/presets'
import type { AuthContextValue } from '@/auth/AuthContext'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob, buildPreset } from '@/test/fixtures'
import { JOB_STATUS_LABELS } from '@/labels'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor, within } from '@testing-library/react'
import { type Job, type JobListResponse, RequestErrorCode } from 'adlens-shared'
import { HistoryTable } from './HistoryTable'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/jobs', () => ({ deleteJob: jest.fn(async () => undefined), listJobs: jest.fn() }))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn() }))

const JOB = buildJob()
const PRESET = buildPreset({ id: 'preset-1', name: 'Meta US' })
const COUNTED_JOB = buildJob({ presetId: PRESET.id })

const withFileName = (id: string, name: string) => buildJob({ id, file: { ...JOB.file, name } })

const page = (jobs: Job[], nextCursor: string | null = null): JobListResponse => ({ jobs, nextCursor })

const renderTable = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<HistoryTable />)
}

// While loading, antd shows the empty state under a spinner that blocks clicks.
const waitForLoaded = () =>
    waitFor(() => expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false'))

// Via the file-name cell rather than findByRole('row', { name }): computing every row's accessible name in an antd table
// takes seconds, enough to time out under a full test run.
const rowOf = async (fileName: string): Promise<HTMLElement> => {
    const row = (await screen.findByText(fileName)).closest('tr')

    if (!row) {
        throw new Error(`No table row holds ${fileName}`)
    }

    return row
}

describe('HistoryTable', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(listJobs).mockResolvedValue(page([JOB]))
        jest.mocked(listPresets).mockResolvedValue([PRESET])
    })

    describe('on a wide screen', () => {
        const originalMatchMedia = window.matchMedia

        // The Preset column is only there from the lg breakpoint, and jsdom matches no media query.
        beforeEach(() => {
            window.matchMedia = (query) => ({ ...originalMatchMedia(query), matches: query.includes('min-width') })
        })

        afterEach(() => {
            window.matchMedia = originalMatchMedia
        })

        it('shows the preset a run was counted for in the Preset column', async () => {
            jest.mocked(listJobs).mockResolvedValue(page([COUNTED_JOB]))
            renderTable()

            const row = await rowOf(JOB.file.name)

            expect(screen.getByRole('columnheader', { name: 'Preset' })).toBeInTheDocument()
            expect(within(row).getByText('Meta US', { selector: 'td' })).toBeInTheDocument()
        })

        it('shows a dash for a run counted for no preset', async () => {
            renderTable()

            expect(within(await rowOf(JOB.file.name)).getByText('—')).toBeInTheDocument()
        })
    })

    // Below lg the Preset column is gone, so the row carries the preset as a tag on a line of its own.
    it("tags the row with the preset a run was counted for, by its current name so a renamed preset's runs follow it", async () => {
        jest.mocked(listJobs).mockResolvedValue(page([COUNTED_JOB]))
        jest.mocked(listPresets).mockResolvedValue([{ ...PRESET, name: 'Meta US and EU' }])
        renderTable()

        const tag = (await within(await rowOf(JOB.file.name)).findByText('Meta US and EU')).closest('.ant-tag')

        expect(tag).toBeInTheDocument()
        expect(tag?.querySelector('.anticon-tag')).not.toBeNull()
    })

    it('leaves out the preset tag for a run counted for no preset', async () => {
        renderTable()

        expect((await rowOf(JOB.file.name)).querySelector('.anticon-tag')).toBeNull()
    })

    it('leaves out the preset tag when the preset is gone', async () => {
        jest.mocked(listJobs).mockResolvedValue(page([COUNTED_JOB]))
        jest.mocked(listPresets).mockResolvedValue([])
        renderTable()

        await waitForLoaded()

        expect((await rowOf(JOB.file.name)).querySelector('.anticon-tag')).toBeNull()
    })

    it('tags an analysis of a sample ad', async () => {
        jest.mocked(listJobs).mockResolvedValue(page([buildJob({ sampleId: 'sample-1' })]))
        renderTable()

        expect(within(await rowOf(JOB.file.name)).getByText('Sample')).toBeInTheDocument()
    })

    it('opens the analysis when anywhere on its row is clicked', async () => {
        const { user } = renderTable()

        await user.click(within(await rowOf(JOB.file.name)).getAllByText(JOB_STATUS_LABELS[JOB.status])[0])

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

    it('shows the copy for a failed load, without claiming there are no analyses', async () => {
        jest.mocked(listJobs).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
        renderTable()

        expect(await screen.findByText(describeRequestError(RequestErrorCode.Unavailable))).toBeInTheDocument()
        await waitForLoaded()

        expect(screen.queryByText('No analyses yet')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Check your first ad' })).not.toBeInTheDocument()
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
