import { useEffect, useRef } from 'react'
import { type SwipeEventData, useSwipeable } from 'react-swipeable'

export interface UseMenuSwipeResult {
    // For an element directly inside the panel that a swipe moves: its parent is the panel.
    panelRef: (element: HTMLElement | null) => void
    // Clears what a swipe left on the panel. Call it once the panel is closed, before it opens again.
    resetSwipe: () => void
}

// Where the header swaps its links for the menu (layout/styles.ts); wider, the menu isn't shown.
const MENU_QUERY = '(max-width: 991.98px)'

// A swipe left past OPEN_DISTANCE opens the menu, and a swipe right past this share of the panel's width closes it;
// a flick faster than FLICK_VELOCITY does either.
const OPEN_DISTANCE_PX = 80
const CLOSE_DISTANCE_RATIO = 0.3
const FLICK_VELOCITY_PX_PER_MS = 0.5
const SETTLE_TRANSITION = 'transform 0.2s ease-out'

// Swipes that start here belong to the element: typing and sliders, the video player's controls, and anything shown
// over the page (a modal, the image viewer).
const OWN_SWIPE_SELECTOR = [
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="slider"]',
    '[data-media-player]',
    '[role="dialog"]',
    '[aria-modal="true"]',
    '.ant-modal-wrap',
    '.ant-image-preview-root',
].join(', ')

const isMenuShown = () => window.matchMedia(MENU_QUERY).matches

const scrollsHorizontally = (element: Element) =>
    element.scrollWidth > element.clientWidth && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX)

const hasOwnSwipe = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) {
        return false
    }

    if (target.closest(OWN_SWIPE_SELECTOR)) {
        return true
    }

    for (let element: Element | null = target; element; element = element.parentElement) {
        if (scrollsHorizontally(element)) {
            return true
        }
    }

    return false
}

const movePanel = (panel: HTMLElement | null, transform: string, transition: string) => {
    if (panel) {
        panel.style.transform = transform
        panel.style.transition = transition
    }
}

const isOpenSwipe = ({ deltaX, dir, velocity }: SwipeEventData): boolean =>
    -deltaX > OPEN_DISTANCE_PX || (dir === 'Left' && velocity > FLICK_VELOCITY_PX_PER_MS)

const isCloseSwipe = ({ deltaX, dir, velocity }: SwipeEventData, panelWidth: number): boolean =>
    deltaX > panelWidth * CLOSE_DISTANCE_RATIO || (dir === 'Right' && velocity > FLICK_VELOCITY_PX_PER_MS)

// Swipes anywhere on the page drive a menu that slides in from the right: a swipe left opens it, and while it's open a
// swipe right drags it out with the finger, then closes it or snaps it back. The panel is moved directly, not through
// state, so a drag doesn't re-render the menu on every touch move.
export function useMenuSwipe(isOpen: boolean, onOpen: () => void, onClose: () => void): UseMenuSwipeResult {
    const panel = useRef<HTMLElement | null>(null)
    // Decided by a gesture's first move: a mostly vertical one scrolls the page or the menu and is left alone.
    const isHorizontal = useRef(false)
    // Also decided by the first move: the gesture belongs to something else, or the menu isn't shown.
    const isIgnored = useRef(false)

    const { ref: attachSwipe } = useSwipeable({
        onSwiping: ({ first, absX, absY, deltaX, event }) => {
            if (first) {
                isHorizontal.current = absX > absY
                isIgnored.current = !isMenuShown() || (!isOpen && hasOwnSwipe(event.target))
            }

            if (!isHorizontal.current || isIgnored.current) {
                return
            }

            // Claimed, since Chrome on Android takes an unclaimed horizontal swipe as Back or Forward and leaves the
            // page. A closed menu leaves a swipe right alone: it isn't the menu's, so Back keeps working.
            if (event.cancelable && (isOpen || deltaX < 0)) {
                event.preventDefault()
            }

            if (isOpen) {
                movePanel(panel.current, `translateX(${Math.max(deltaX, 0)}px)`, 'none')
            }
        },
        onSwiped: (eventData) => {
            if (!isHorizontal.current || isIgnored.current) {
                return
            }

            if (!isOpen) {
                if (isOpenSwipe(eventData)) {
                    onOpen()
                }

                return
            }

            if (isCloseSwipe(eventData, panel.current?.offsetWidth ?? 0)) {
                // The drawer's own closing slide ends where this one does, so the panel doesn't jump back first.
                movePanel(panel.current, 'translateX(100%)', SETTLE_TRANSITION)
                onClose()
                return
            }

            movePanel(panel.current, '', SETTLE_TRANSITION)
        },
        // Not passive, so a horizontal swipe can be claimed above; a vertical one still scrolls.
        touchEventOptions: { passive: false },
    })

    useEffect(() => {
        attachSwipe(document.documentElement)

        return () => attachSwipe(null)
    }, [attachSwipe])

    const panelRef = (element: HTMLElement | null) => {
        panel.current = element?.parentElement ?? null
    }

    const resetSwipe = () => movePanel(panel.current, '', '')

    return { panelRef, resetSwipe }
}
