import { screen } from '@testing-library/react'
import { type Job, JobErrorCode, JobStatus } from 'adlens-shared'
import { useJobVideo } from '@/hooks/useJobVideo'
import { buildAnalysis, buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { AnalysisView } from './AnalysisView'

const mockPush = jest.fn()
let mockJob: Job | undefined

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }) }))
jest.mock('@/hooks/useJob', () => ({ useJob: () => ({ job: mockJob, isLoading: false, error: null }) }))
jest.mock('@/hooks/useJobVideo', () => ({ useJobVideo: jest.fn(() => ({ url: 'https://storage.example/video.mp4' })) }))
jest.mock('@vidstack/react', () => ({
    MediaPlayer: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
    MediaProvider: () => null,
}))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))
jest.mock('./DeleteJobButton', () => ({ DeleteJobButton: () => null }))
jest.mock('@/components/utils/BackButton', () => ({ BackButton: () => null }))

const renderView = (job: Job) => {
    mockJob = job

    return renderWithProviders(<AnalysisView jobId={job.id} />)
}

describe('AnalysisView', () => {
    beforeEach(() => jest.clearAllMocks())

    it('replays the video next to the results of an analysis', () => {
        renderView(buildJob({ status: JobStatus.Analyzed, analysis: buildAnalysis() }))

        expect(screen.getByRole('region', { name: 'Video ad summer-ad.mp4' })).toBeInTheDocument()
        expect(useJobVideo).toHaveBeenCalledWith('job-1', true)
    })

    describe('for a failed analysis', () => {
        const FAILED_JOB = buildJob({ status: JobStatus.Error, errorCode: JobErrorCode.AnalysisTimedOut })

        it('shows no player and never asks for the video, which is deleted soon after the failure', () => {
            renderView(FAILED_JOB)

            expect(screen.queryByRole('region', { name: /Video ad/ })).not.toBeInTheDocument()
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

        it('offers to analyze another video', async () => {
            const { user } = renderView(FAILED_JOB)

            await user.click(screen.getByRole('button', { name: 'Analyze another video' }))

            expect(mockPush).toHaveBeenCalledWith('/')
        })
    })
})
