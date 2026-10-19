import { useLeaveGuardStore } from '@/contexts/stores/leaveGuardStore'
import { renderHook } from '@testing-library/react'
import { useLeaveGuard } from './useLeaveGuard'

// What the browser checks before it unloads the page: a cancelled event makes it ask.
const isUnloadBlocked = () => !window.dispatchEvent(new Event('beforeunload', { cancelable: true }))

describe('useLeaveGuard', () => {
    afterEach(() => useLeaveGuardStore.setState({ isGuarded: false }))

    it('makes the browser ask before the page unloads, and guards the app’s own navigation', () => {
        renderHook(() => useLeaveGuard(true))

        expect(isUnloadBlocked()).toBe(true)
        expect(useLeaveGuardStore.getState().isGuarded).toBe(true)
    })

    it('lets the page go once there is nothing to lose', () => {
        const { rerender, unmount } = renderHook(({ isGuarded }) => useLeaveGuard(isGuarded), {
            initialProps: { isGuarded: true },
        })

        rerender({ isGuarded: false })

        expect(isUnloadBlocked()).toBe(false)
        expect(useLeaveGuardStore.getState().isGuarded).toBe(false)

        rerender({ isGuarded: true })
        unmount()

        expect(isUnloadBlocked()).toBe(false)
        expect(useLeaveGuardStore.getState().isGuarded).toBe(false)
    })
})
