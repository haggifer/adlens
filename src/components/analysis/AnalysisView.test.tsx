import { useJobVideo } from '@/hooks/useJobVideo'
import { buildAnalysis, buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { type Job, JobErrorCode, type JobMedia, JobStatus } from 'adlens-shared'
import { AnalysisView } from './AnalysisView'

const mockPush = jest.fn()
let mockJob: Job | undefined

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }) }))
jest.mock('@/hooks/useJob', () => ({ useJob: () => ({ job: mockJob, isLoading: false, error: null }) }))
jest.mock('@/hooks/useJobVideo', () => ({
    useJobVideo: jest.fn(() => ({ url: 'https://storage.example/video.mp4', isMissing: false })),
}))
jest.mock('@vidstack/react', () => ({
    MediaPlayer: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
    MediaProvider: () => null,
}))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))
jest.mock('./DeleteJobButton', () => ({ DeleteJobButton: () => null }))
jest.mock('@/components/utils/BackButton', () => ({ BackButton: () => null }))

const MEDIA: JobMedia = {
    durationS: 20,
    width: 1080,
    height: 1920,
    hasAudio: true,
    sizeBytes: 1000,
    contentType: 'video/mp4',
}

const PLAYER = { name: /Video ad/ }

const renderView = (job: Job) => {
    mockJob = job

    return renderWithProviders(<AnalysisView jobId={job.id} />)
}

describe('AnalysisView', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(useJobVideo).mockReturnValue({ url: 'https://storage.example/video.mp4', isMissing: false })
    })

    it('replays the video next to the results of an analysis', async () => {
        renderView(buildJob({ status: JobStatus.Analyzed, media: MEDIA, analysis: buildAnalysis() }))

        expect(await screen.findByRole('region', { name: 'Video ad summer-ad.mp4' })).toBeInTheDocument()
        expect(useJobVideo).toHaveBeenCalledWith('job-1', true)
    })

    it('shows the results without a player once the video has been deleted', () => {
        jest.mocked(useJobVideo).mockReturnValue({ url: undefined, isMissing: true })

        const { container } = renderView(
            buildJob({ status: JobStatus.Analyzed, media: MEDIA, analysis: buildAnalysis() }),
        )

        expect(screen.queryByRole('region', PLAYER)).not.toBeInTheDocument()
        expect(container.querySelector('.ant-spin')).not.toBeInTheDocument()
    })

    it.each([JobStatus.Verifying, JobStatus.Analyzed])(
        'shows no player and never asks for the video of a %s job that has no verified video',
        (status) => {
            const { container } = renderView(buildJob({ status, analysis: buildAnalysis() }))

            expect(screen.queryByRole('region', PLAYER)).not.toBeInTheDocument()
            expect(container.querySelector('.ant-spin')).not.toBeInTheDocument()
            expect(useJobVideo).not.toHaveBeenCalledWith('job-1', true)
        },
    )

    it('shows only why a pending analysis never started, without a player', () => {
        const { container } = renderView(buildJob({ status: JobStatus.Pending }))

        expect(screen.getByText('This analysis never started')).toBeInTheDocument()
        expect(screen.queryByRole('region', PLAYER)).not.toBeInTheDocument()
        expect(container.querySelector('.ant-spin')).not.toBeInTheDocument()
        expect(useJobVideo).not.toHaveBeenCalledWith('job-1', true)
    })

    describe('for a failed analysis', () => {
        const FAILED_JOB = buildJob({ status: JobStatus.Error, errorCode: JobErrorCode.AnalysisTimedOut })

        it('shows no player and never asks for the video, which is deleted soon after the failure', () => {
            renderView(FAILED_JOB)

            expect(screen.queryByRole('region', PLAYER)).not.toBeInTheDocument()
            expect(useJobVideo).toHaveBeenCalledWith('job-1', false)
            expect(useJobVideo).not.toHaveBeenCalledWith('job-1', true)
        })

        it('says why it failed and whether the run was counted', () => {
            renderView(FAILED_JOB)

            expect(screen.getByText('The analysis failed')).toBeInTheDocument()
            expect(
                screen.getByText("The analysis took too long and was stopped. This run wasn't counted."),
            ).toBeInTheDocument()
        })

        it.each([
            [JobErrorCode.VideoCheckFailed, "We couldn't check this video. Please try again. This run wasn't counted."],
            [JobErrorCode.UploadFailed, "The upload didn't finish. Please try again. This run wasn't counted."],
        ])('explains a run that ended in %s before the analysis started', (errorCode, copy) => {
            renderView(buildJob({ status: JobStatus.Error, errorCode }))

            expect(screen.getByText('The analysis failed')).toBeInTheDocument()
            expect(screen.getByText(copy)).toBeInTheDocument()
            expect(screen.queryByRole('region', PLAYER)).not.toBeInTheDocument()
        })

        it('offers to analyze another video', async () => {
            const { user } = renderView(FAILED_JOB)

            await user.click(screen.getByRole('button', { name: 'Analyze another video' }))

            expect(mockPush).toHaveBeenCalledWith('/')
        })
    })
})
