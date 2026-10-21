import { ApiRequestError, describeRequestError } from '@/api/errors'
import { listJobs, restartJob } from '@/api/jobs'
import { listPresets } from '@/api/presets'
import type { AuthContextValue } from '@/auth/AuthContext'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { buildJob, buildPreset } from '@/test/fixtures'
import { RESTART_CLOCK_MS } from '@/job-status'
import {
    ALL_PLACEMENTS_LABEL,
    ALL_PLATFORMS_LABEL,
    formatPlacementLabel,
    JOB_STATUS_LABELS,
    PLATFORM_LABELS,
} from '@/labels'
import { renderWithProviders } from '@/test/render'
import { act, screen, waitFor, within } from '@testing-library/react'
import {
    type Job,
    type JobListResponse,
    JOB_START_WINDOW_MS,
    JobStatus,
    Placement,
    Platform,
    RequestErrorCode,
} from 'adlens-shared'
import { HistoryTable } from './HistoryTable'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => '/history' }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/jobs', () => ({
    deleteJob: jest.fn(async () => undefined),
    listJobs: jest.fn(),
    restartJob: jest.fn(),
}))
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
// The table and its presets load in about 650 ms alone, past the default 1 s wait under a full parallel run.
const waitForLoaded = () =>
    waitFor(() => expect(screen.getByRole('table').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false'), {
        timeout: 3000,
    })

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

        it("tags each platform, and each placement in its platform's colour", async () => {
            jest.mocked(listJobs).mockResolvedValue(
                page([
                    buildJob({
                        settings: {
                            platforms: [Platform.Meta, Platform.YouTube],
                            placements: [Placement.MetaReels, Placement.YouTubeShorts],
                            markets: [],
                        },
                    }),
                ]),
            )
            renderTable()

            const row = await rowOf(JOB.file.name)
            const metaTag = within(row).getByText(PLATFORM_LABELS[Platform.Meta]).closest('.ant-tag')
            const youTubeTag = within(row).getByText(PLATFORM_LABELS[Platform.YouTube]).closest('.ant-tag')
            const reelsTag = within(row).getByTitle(formatPlacementLabel(Placement.MetaReels))
            const shortsTag = within(row).getByTitle(formatPlacementLabel(Placement.YouTubeShorts))

            expect(metaTag?.className).not.toBe(youTubeTag?.className)
            expect(reelsTag.className).toBe(metaTag?.className)
            expect(shortsTag.className).toBe(youTubeTag?.className)
        })

        it('tags every placement of a platform saved without any of them, as the analysis page lists them', async () => {
            jest.mocked(listJobs).mockResolvedValue(
                page([buildJob({ settings: { platforms: [Platform.TikTok], placements: [], markets: [] } })]),
            )
            renderTable()

            const row = await rowOf(JOB.file.name)

            expect(within(row).getByTitle(formatPlacementLabel(Placement.TikTokInFeed))).toBeInTheDocument()
            expect(within(row).queryByText(ALL_PLACEMENTS_LABEL)).not.toBeInTheDocument()
        })

        it('tags a run with no platform or placement chosen as checked against all of them', async () => {
            renderTable()

            const row = await rowOf(JOB.file.name)

            expect(within(row).getByText(ALL_PLATFORMS_LABEL).closest('.ant-tag')).not.toBeNull()
            expect(within(row).getByText(ALL_PLACEMENTS_LABEL).closest('.ant-tag')).not.toBeNull()
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

    describe('a failed run', () => {
        const failedAgo = (id: string, ms: number) =>
            buildJob({
                id,
                status: JobStatus.Error,
                file: { ...JOB.file, name: `${id}.mp4` },
                createdAt: new Date(Date.now() - ms).toISOString(),
            })

        // jsdom matches no media query, so the restart shows only in the phone line under the name, which CSS hides.
        const restartIn = (row: HTMLElement) =>
            within(row).queryAllByRole('button', { name: 'Restart analysis', hidden: true })

        it('offers a restart next to its tag only within the start window', async () => {
            jest.mocked(listJobs).mockResolvedValue(
                page([failedAgo('recent', 0), failedAgo('old', JOB_START_WINDOW_MS), buildJob({ id: 'done' })]),
            )
            renderTable()

            expect(restartIn(await rowOf('recent.mp4')).length).toBeGreaterThan(0)
            expect(restartIn(await rowOf('old.mp4'))).toHaveLength(0)
            expect(restartIn(await rowOf(JOB.file.name))).toHaveLength(0)
        })

        it('stops offering it once the start window passes while the page is open', async () => {
            jest.useFakeTimers({ advanceTimers: true })

            try {
                jest.mocked(listJobs).mockResolvedValue(page([failedAgo('ending', JOB_START_WINDOW_MS - 1000)]))
                renderTable()

                const row = await rowOf('ending.mp4')

                expect(restartIn(row).length).toBeGreaterThan(0)

                await act(async () => jest.advanceTimersByTimeAsync(RESTART_CLOCK_MS))

                expect(restartIn(row)).toHaveLength(0)
            } finally {
                jest.useRealTimers()
            }
        })

        it('opens the new run, not the failed one, once the restart has started', async () => {
            jest.mocked(listJobs).mockResolvedValue(page([failedAgo('recent', 0)]))
            jest.mocked(restartJob).mockResolvedValueOnce(buildJob({ id: 'job-2', status: JobStatus.Queued }))
            const { user } = renderTable()

            await waitForLoaded()
            await user.click(restartIn(await rowOf('recent.mp4'))[0])

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/analyses/job-2'))
            expect(mockPush).toHaveBeenCalledTimes(1)
        })
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
