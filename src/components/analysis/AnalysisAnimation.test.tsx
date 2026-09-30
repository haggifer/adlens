import { act, render, screen } from '@testing-library/react'
import { AnalysisAnimation, ICON_INTERVAL_MS } from './AnalysisAnimation'

const iconNamed = (name: string) => screen.queryByRole('img', { name, hidden: true })

const preferReducedMotion = (isReduced: boolean) => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: isReduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }))
}

describe('AnalysisAnimation', () => {
    const originalMatchMedia = window.matchMedia

    beforeEach(() => {
        jest.useFakeTimers()
        preferReducedMotion(false)
    })

    afterEach(() => {
        jest.useRealTimers()
        window.matchMedia = originalMatchMedia
    })

    it('shows one icon at a time and moves on to the next every few seconds', () => {
        render(<AnalysisAnimation />)

        expect(iconNamed('notification')).toBeInTheDocument()

        act(() => jest.advanceTimersByTime(ICON_INTERVAL_MS))

        expect(iconNamed('notification')).not.toBeInTheDocument()
        expect(iconNamed('play-circle')).toBeInTheDocument()
    })

    it('starts over after the last icon', () => {
        render(<AnalysisAnimation />)

        act(() => jest.advanceTimersByTime(ICON_INTERVAL_MS * 6))

        expect(iconNamed('notification')).toBeInTheDocument()
    })

    it('keeps one icon still for people who prefer reduced motion', () => {
        preferReducedMotion(true)
        render(<AnalysisAnimation />)

        act(() => jest.advanceTimersByTime(ICON_INTERVAL_MS * 3))

        expect(iconNamed('notification')).toBeInTheDocument()
    })

    it('is decoration only, hidden from assistive technology', () => {
        render(<AnalysisAnimation />)

        expect(screen.queryByRole('img', { name: 'notification' })).not.toBeInTheDocument()
    })
})
