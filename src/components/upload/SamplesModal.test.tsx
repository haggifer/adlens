import { ApiRequestError } from '@/api/errors'
import { listSamples } from '@/api/samples'
import { buildSample } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Placement, Platform, RequestErrorCode } from 'adlens-shared'
import { SampleRow, SamplesModal } from './SamplesModal'

jest.mock('@/api/samples', () => ({ listSamples: jest.fn() }))

const SAMPLE = buildSample({
    settings: { platforms: [Platform.YouTube], placements: [Placement.YouTubeShorts], markets: [] },
})

const ROW_NAME = /use sample ad: running shoes/i

// A <video> has no ARIA role, so the preview is found by its tag.
const getPreview = (container: HTMLElement) => container.querySelector('video') as HTMLVideoElement

describe('SampleRow', () => {
    it('shows the preview, duration, platforms and description', () => {
        const { container } = render(<SampleRow sample={SAMPLE} onSelect={jest.fn()} />)

        expect(screen.getByText('Running shoes')).toBeInTheDocument()
        expect(screen.getByText('0:15')).toBeInTheDocument()
        expect(screen.getByText('Google')).toBeInTheDocument()
        expect(screen.getByText(SAMPLE.description)).toBeInTheDocument()
        expect(getPreview(container)).toHaveAttribute('src', SAMPLE.previewUrl)
    })

    it('says a sample without platforms is checked against all of them', () => {
        render(
            <SampleRow
                sample={buildSample({ settings: { platforms: [], placements: [], markets: [] } })}
                onSelect={jest.fn()}
            />,
        )

        expect(screen.getByText('All platforms')).toBeInTheDocument()
    })

    it('selects the sample when the row is clicked', async () => {
        const onSelect = jest.fn()

        render(<SampleRow sample={SAMPLE} onSelect={onSelect} />)
        await userEvent.click(screen.getByText(SAMPLE.description))

        expect(onSelect).toHaveBeenCalledWith(SAMPLE)
    })

    it.each(['{Enter}', ' '])('selects the sample from the keyboard with %p', async (key) => {
        const onSelect = jest.fn()

        render(<SampleRow sample={SAMPLE} onSelect={onSelect} />)
        await userEvent.tab()

        expect(screen.getByRole('button', { name: ROW_NAME })).toHaveFocus()

        await userEvent.keyboard(key)

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith(SAMPLE)
    })

    it('lets the preview play without selecting the sample', async () => {
        const onSelect = jest.fn()
        const { container } = render(<SampleRow sample={SAMPLE} onSelect={onSelect} />)

        await userEvent.click(getPreview(container))

        expect(onSelect).not.toHaveBeenCalled()
    })
})

describe('SamplesModal', () => {
    beforeEach(() => jest.mocked(listSamples).mockReset())

    it('loads the samples only once the picker opens', async () => {
        jest.mocked(listSamples).mockResolvedValue([SAMPLE])
        const { rerender } = renderWithProviders(
            <SamplesModal isOpen={false} onClose={jest.fn()} onSelect={jest.fn()} />,
        )

        expect(listSamples).not.toHaveBeenCalled()

        rerender(<SamplesModal isOpen onClose={jest.fn()} onSelect={jest.fn()} />)

        expect(await screen.findByRole('button', { name: ROW_NAME })).toBeInTheDocument()
        expect(listSamples).toHaveBeenCalledTimes(1)
    })

    it('says when there are no samples yet', async () => {
        jest.mocked(listSamples).mockResolvedValue([])
        renderWithProviders(<SamplesModal isOpen onClose={jest.fn()} onSelect={jest.fn()} />)

        expect(await screen.findByText('No sample ads are available yet.')).toBeInTheDocument()
    })

    it('pauses the other previews when one starts playing', async () => {
        const pause = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
        jest.mocked(listSamples).mockResolvedValue([SAMPLE, buildSample({ id: 'sample-2', title: 'Coffee' })])
        renderWithProviders(<SamplesModal isOpen onClose={jest.fn()} onSelect={jest.fn()} />)

        await screen.findByRole('button', { name: ROW_NAME })
        const [first, second] = Array.from(document.querySelectorAll('video'))

        fireEvent.play(second)

        expect(pause.mock.contexts).toEqual([first])
        pause.mockRestore()
    })

    it('shows the copy for a failed load', async () => {
        jest.mocked(listSamples).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
        renderWithProviders(<SamplesModal isOpen onClose={jest.fn()} onSelect={jest.fn()} />)

        expect(await screen.findByText('AdLens is briefly unavailable. Please try again.')).toBeInTheDocument()
    })
})
