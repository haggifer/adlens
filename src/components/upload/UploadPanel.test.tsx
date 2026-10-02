import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { UploadPanel } from './UploadPanel'

// Vidstack's custom elements don't run in jsdom, and the empty state renders no player.
jest.mock('@vidstack/react', () => ({ MediaPlayer: () => null, MediaProvider: () => null }))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))

describe('UploadPanel', () => {
    it('offers no way to pick a video while disabled', () => {
        renderWithProviders(
            <UploadPanel
                video={null}
                onSelect={jest.fn()}
                onClear={jest.fn()}
                onBrowseSamples={jest.fn()}
                isDisabled
            />,
        )

        expect(screen.getByText('Try a sample ad').closest('button')).toBeDisabled()
        expect(document.querySelector('input[type="file"]')).toBeDisabled()
    })
})
