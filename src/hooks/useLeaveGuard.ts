import { useLeaveGuardStore } from '@/contexts/stores/leaveGuardStore'
import { useEffect } from 'react'

// The browser shows its own wording, and only once the page has had a click or a key press.
const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()

// While `isGuarded`, leaving the page asks first: a reload, a closed tab or a typed address through the browser's
// beforeunload dialog, and the app's own links and menu items through isLeaveConfirmed.
export function useLeaveGuard(isGuarded: boolean): void {
    const setIsGuarded = useLeaveGuardStore((s) => s.setIsGuarded)

    useEffect(() => {
        if (!isGuarded) {
            return
        }

        setIsGuarded(true)
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            setIsGuarded(false)
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isGuarded, setIsGuarded])
}
