import { fireEvent, render, screen } from '@testing-library/react'
import { AnalysisAnimation } from './AnalysisAnimation'

const iconNamed = (name: string) => screen.queryByRole('img', { name, hidden: true })

// The icon fades in and out once per animation cycle and moves on when a cycle ends.
const endCycles = (container: HTMLElement, count: number) => {
    for (let cycle = 0; cycle < count; cycle += 1) {
        fireEvent.animationIteration(container.firstElementChild!)
    }
}

describe('AnalysisAnimation', () => {
    it('shows one icon at a time and moves on to the next when its fade ends', () => {
        const { container } = render(<AnalysisAnimation />)

        expect(iconNamed('notification')).toBeInTheDocument()

        endCycles(container, 1)

        expect(iconNamed('notification')).not.toBeInTheDocument()
        expect(iconNamed('play-circle')).toBeInTheDocument()
    })

    it('starts over after the last icon', () => {
        const { container } = render(<AnalysisAnimation />)

        endCycles(container, 6)

        expect(iconNamed('notification')).toBeInTheDocument()
    })

    it('is decoration only, hidden from assistive technology', () => {
        render(<AnalysisAnimation />)

        expect(screen.queryByRole('img', { name: 'notification' })).not.toBeInTheDocument()
    })
})
