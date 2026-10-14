import { fireEvent, renderHook } from '@testing-library/react'
import { useMenuSwipe } from './useMenuSwipe'

const MENU_QUERY = '(max-width: 991.98px)'

const swipe = (target: Element, from: [number, number], to: [number, number]) => {
    fireEvent.touchStart(target, { touches: [{ clientX: from[0], clientY: from[1] }] })
    fireEvent.touchMove(target, { touches: [{ clientX: to[0], clientY: to[1] }] })
    fireEvent.touchEnd(target, { touches: [] })
}

describe('useMenuSwipe', () => {
    const originalMatchMedia = window.matchMedia

    beforeEach(() => {
        window.matchMedia = (query) => ({ ...originalMatchMedia(query), matches: query === MENU_QUERY })
    })

    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    // Reopened before the drawer's closing slide ends, nothing has cleared the swipe's off-screen position yet.
    it('clears what a swipe left on the panel when the menu opens again', () => {
        const panel = document.createElement('div')
        const content = panel.appendChild(document.createElement('div'))
        const onClose = jest.fn()
        const { result, rerender } = renderHook(({ isOpen }) => useMenuSwipe(isOpen, jest.fn(), onClose), {
            initialProps: { isOpen: true },
        })

        result.current.panelRef(content)
        swipe(document.body, [40, 200], [240, 210])

        expect(onClose).toHaveBeenCalled()
        expect(panel.style.transform).toBe('translateX(100%)')

        rerender({ isOpen: false })
        rerender({ isOpen: true })

        expect(panel.style.transform).toBe('')
        expect(panel.style.transition).toBe('')
    })
})
