import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Placement, Platform, type Sample, VideoMimeType } from 'adlens-shared'
import { SampleRow } from './SamplesModal'

const SAMPLE: Sample = {
    id: 's1',
    title: 'Running shoes',
    description: 'A 15-second product spot with a spoken offer',
    settings: { platforms: [Platform.YouTube], placements: [Placement.YouTubeShorts], markets: [] },
    media: {
        durationS: 15,
        width: 1080,
        height: 1920,
        hasAudio: true,
        sizeBytes: 5000,
        contentType: VideoMimeType.Mp4,
    },
    contentType: VideoMimeType.Mp4,
    previewUrl: 'https://storage.googleapis.com/bucket/samples/s1.mp4?X-Goog-Signature=abc',
}

describe('SampleRow', () => {
    it('shows the preview, platforms and description', () => {
        const { container } = render(<SampleRow sample={SAMPLE} onSelect={jest.fn()} />)

        expect(screen.getByText('Running shoes')).toBeInTheDocument()
        expect(screen.getByText('YouTube')).toBeInTheDocument()
        expect(screen.getByText('A 15-second product spot with a spoken offer')).toBeInTheDocument()
        expect(container.querySelector('video')).toHaveAttribute('src', SAMPLE.previewUrl)
    })

    it('selects the sample when the row is clicked or activated with the keyboard', async () => {
        const onSelect = jest.fn()

        render(<SampleRow sample={SAMPLE} onSelect={onSelect} />)

        const row = screen.getByRole('button', { name: /use sample ad: running shoes/i })

        await userEvent.click(screen.getByText('A 15-second product spot with a spoken offer'))
        row.focus()
        await userEvent.keyboard('{Enter}')

        expect(onSelect).toHaveBeenCalledTimes(2)
        expect(onSelect).toHaveBeenCalledWith(SAMPLE)
    })

    it('lets the preview play without selecting the sample', () => {
        const onSelect = jest.fn()
        const { container } = render(<SampleRow sample={SAMPLE} onSelect={onSelect} />)

        fireEvent.click(container.querySelector('video')!)

        expect(onSelect).not.toHaveBeenCalled()
    })
})
