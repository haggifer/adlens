import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { LazyVideoPlayer } from './LazyVideoPlayer'

// Vidstack's custom elements don't run in jsdom.
jest.mock('@vidstack/react', () => ({
    MediaPlayer: ({ className }: { className?: string }) => <div data-testid="player" className={className} />,
    MediaProvider: () => null,
}))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))

describe('LazyVideoPlayer', () => {
    it('holds the player’s box while the player loads', async () => {
        const { container } = renderWithProviders(
            <LazyVideoPlayer className="stage-player" url="blob:video" contentType="video/mp4" ariaLabel="Video" />,
        )

        expect(container.querySelector('.stage-player [aria-busy="true"]')).toBeInTheDocument()
        expect(await screen.findByTestId('player')).toHaveClass('stage-player')
    })
})
