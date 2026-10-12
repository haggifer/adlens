import { useRef } from 'react'
import { type SwipeableHandlers, type SwipeEventData, useSwipeable } from 'react-swipeable'

export interface UseSwipeToCloseResult {
    // For an element directly inside the panel that a swipe moves: its parent is the panel.
    swipeHandlers: SwipeableHandlers
    // Clears what a swipe left on the panel. Call it once the panel is closed, before it opens again.
    resetSwipe: () => void
}

// A swipe right past this share of the panel's width closes it, as does a flick faster than CLOSE_VELOCITY.
const CLOSE_DISTANCE_RATIO = 0.3
const CLOSE_VELOCITY_PX_PER_MS = 0.5
const SETTLE_TRANSITION = 'transform 0.2s ease-out'

const movePanel = (panel: HTMLElement | null, transform: string, transition: string) => {
    if (panel) {
        panel.style.transform = transform
        panel.style.transition = transition
    }
}

const isCloseSwipe = ({ deltaX, dir, velocity }: SwipeEventData, panelWidth: number): boolean =>
    deltaX > panelWidth * CLOSE_DISTANCE_RATIO || (dir === 'Right' && velocity > CLOSE_VELOCITY_PX_PER_MS)

// Lets a panel that slides in from the right be swiped back out: it follows the finger, then closes or snaps back.
// The panel is moved directly, not through state, so a drag doesn't re-render the menu on every touch move.
export function useSwipeToClose(onClose: () => void): UseSwipeToCloseResult {
    const panel = useRef<HTMLElement | null>(null)
    // Decided by a gesture's first move: a mostly vertical one scrolls the menu and is left alone.
    const isHorizontal = useRef(false)

    const handlers = useSwipeable({
        onSwiping: ({ first, absX, absY, deltaX, event }) => {
            if (first) {
                isHorizontal.current = absX > absY
            }

            if (!isHorizontal.current) {
                return
            }

            // Chrome on Android takes an unclaimed horizontal swipe as Back and leaves the page.
            if (event.cancelable) {
                event.preventDefault()
            }

            movePanel(panel.current, `translateX(${Math.max(deltaX, 0)}px)`, 'none')
        },
        onSwiped: (eventData) => {
            if (!isHorizontal.current) {
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
        // Not passive, so a horizontal swipe can be claimed above; a vertical one still scrolls the menu.
        touchEventOptions: { passive: false },
    })

    const swipeHandlers: SwipeableHandlers = {
        ...handlers,
        ref: (element) => {
            panel.current = element?.parentElement ?? null
            handlers.ref(element)
        },
    }

    const resetSwipe = () => movePanel(panel.current, '', '')

    return { swipeHandlers, resetSwipe }
}
