import { act, fireEvent, renderHook } from '@testing-library/react'
import { useMenuSwipe } from './useMenuSwipe'

const MENU_QUERY = '(max-width: 991.98px)'

const swipe = (target: Element, from: [number, number], to: [number, number]) => {
    fireEvent.touchStart(target, { touches: [{ clientX: from[0], clientY: from[1] }] })
    fireEvent.touchMove(target, { touches: [{ clientX: to[0], clientY: to[1] }] })
    fireEvent.touchEnd(target, { touches: [] })
}

const swipeLeft = (target: Element = document.body) => swipe(target, [300, 200], [100, 205])

describe('useMenuSwipe', () => {
    const originalMatchMedia = window.matchMedia
    const queryListeners = new Set<() => void>()
    let isNarrow = true

    const setNarrow = (value: boolean) =>
        act(() => {
            isNarrow = value
            queryListeners.forEach((listener) => listener())
        })

    const renderClosedMenu = () => {
        const onOpen = jest.fn()
        const view = renderHook(() => useMenuSwipe(false, onOpen, jest.fn()))

        return { ...view, onOpen }
    }

    beforeEach(() => {
        isNarrow = true
        queryListeners.clear()
        // Only the menu's own query and its change listeners matter here.
        window.matchMedia = (query) =>
            ({
                ...originalMatchMedia(query),
                matches: query === MENU_QUERY && isNarrow,
                addEventListener: (_type: string, listener: () => void) => queryListeners.add(listener),
                removeEventListener: (_type: string, listener: () => void) => queryListeners.delete(listener),
            }) as unknown as MediaQueryList
    })

    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    it('opens the menu with a swipe left where the menu is shown', () => {
        const { onOpen } = renderClosedMenu()

        swipeLeft()

        expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('listens only while the menu is shown, following the width as it changes', () => {
        isNarrow = false
        const { onOpen } = renderClosedMenu()

        swipeLeft()

        expect(onOpen).not.toHaveBeenCalled()

        setNarrow(true)
        swipeLeft()

        expect(onOpen).toHaveBeenCalledTimes(1)

        setNarrow(false)
        swipeLeft()

        expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('stops listening once unmounted', () => {
        const { onOpen, unmount } = renderClosedMenu()

        unmount()
        swipeLeft()

        expect(onOpen).not.toHaveBeenCalled()
    })

    // antd renders a Select's list, a Popover and a Dropdown in <body>, outside any modal they open from.
    it.each(['ant-select-dropdown', 'ant-popover', 'ant-dropdown'])('leaves a swipe over a %s to it', (className) => {
        const popup = document.body.appendChild(document.createElement('div'))
        const { onOpen } = renderClosedMenu()

        popup.className = className
        swipeLeft(popup.appendChild(document.createElement('div')))
        popup.remove()

        expect(onOpen).not.toHaveBeenCalled()
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
