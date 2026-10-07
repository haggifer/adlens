import { ApiRequestError } from '@/api/errors'
import type { UseDemosResult } from '@/hooks/useDemos'
import { buildAnalysis, buildFinding, buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { type Demo, Market, Platform, RequestErrorCode, VideoMimeType } from 'adlens-shared'
import { DemoView } from './DemoView'

const mockPush = jest.fn()
let mockDemos: UseDemosResult

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/hooks/useDemos', () => ({ useDemos: () => mockDemos }))
jest.mock('@vidstack/react', () => ({
    MediaPlayer: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
    MediaProvider: () => null,
}))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))

const MEDIA = {
    durationS: 55,
    width: 1920,
    height: 1080,
    hasAudio: true,
    sizeBytes: 1000,
    contentType: VideoMimeType.Mp4,
}

const buildDemo = (slug: string, label: string, topic: string): Demo => ({
    id: `job-${slug}`,
    slug,
    label,
    title: `Title of ${slug}`,
    subtitle: `Subtitle of ${slug}`,
    job: buildJob({
        id: `job-${slug}`,
        settings: { platforms: [Platform.Amazon], placements: [], markets: [Market.US] },
        media: MEDIA,
        analysis: buildAnalysis({ findings: [buildFinding({ topic })] }),
    }),
    videoUrl: `https://storage.example/${slug}.mp4`,
})

const DEMOS = [
    buildDemo('clothing-care-demo', 'Blocking issues', 'Contact information'),
    buildDemo('puzzle-game', 'Needs review', 'Fake interface'),
]

const loaded = (demos: Demo[]): UseDemosResult => ({ demos, isLoading: false, error: null })

describe('DemoView', () => {
    beforeEach(() => jest.clearAllMocks())

    it('opens on the first demo: its summary, what it was checked for, its video and its report', async () => {
        mockDemos = loaded(DEMOS)
        renderWithProviders(<DemoView />)

        expect(screen.getByRole('heading', { name: 'Title of clothing-care-demo' })).toBeInTheDocument()
        expect(screen.getByText('Subtitle of clothing-care-demo')).toBeInTheDocument()
        expect(screen.getByText('0:55 video · checked for Amazon Ads in United States')).toBeInTheDocument()
        expect(screen.getByText('Contact information')).toBeInTheDocument()
        expect(await screen.findByRole('region', { name: /Video ad/ })).toBeInTheDocument()
    })

    it('switches to another demo from its tab', async () => {
        mockDemos = loaded(DEMOS)
        const { user } = renderWithProviders(<DemoView />)

        await user.click(screen.getByText('Needs review'))

        expect(screen.getByRole('heading', { name: 'Title of puzzle-game' })).toBeInTheDocument()
        expect(screen.getByText('Fake interface')).toBeInTheDocument()
        expect(screen.queryByText('Contact information')).not.toBeInTheDocument()
    })

    it('shows a single demo without tabs', () => {
        mockDemos = loaded([DEMOS[0]])
        renderWithProviders(<DemoView />)

        expect(screen.queryByText('Blocking issues')).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Title of clothing-care-demo' })).toBeInTheDocument()
    })

    it('says when there are no demos yet', () => {
        mockDemos = loaded([])
        renderWithProviders(<DemoView />)

        expect(screen.getByText('No example reports yet.')).toBeInTheDocument()
    })

    it('shows the copy for a failed load', () => {
        mockDemos = { demos: [], isLoading: false, error: new ApiRequestError(RequestErrorCode.Unavailable) }
        renderWithProviders(<DemoView />)

        expect(screen.getByText('AdLens is briefly unavailable. Please try again.')).toBeInTheDocument()
    })

    it('leads to the upload page to analyze an ad of one’s own', async () => {
        mockDemos = loaded(DEMOS)
        const { user } = renderWithProviders(<DemoView />)

        await user.click(screen.getByRole('button', { name: 'Analyze your ad' }))

        expect(mockPush).toHaveBeenCalledWith('/')
    })
})
