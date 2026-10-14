import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// Asked a little after the moment, so the API's clock has passed it too.
const NEXT_FREE_GRACE_MS = 5_000

// setTimeout fires at once past this delay (about 24.8 days); nextFreeAt is at most a week away.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

// At nextFreeAt an analysis frees up, but nothing else asks the API again while the visitor stays on the page (focus
// refetching is off), so Run would stay disabled until a reload. Mount it once: every consumer would set its own timer.
export function useRefreshAtNextFree(nextFreeAt: string | null | undefined): void {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!nextFreeAt) {
            return
        }

        const delay = Math.max(Date.parse(nextFreeAt) - Date.now(), 0) + NEXT_FREE_GRACE_MS

        if (delay > MAX_TIMEOUT_MS) {
            return
        }

        // By prefix, as after a run: the quota and the admission answer are kept per user.
        const timer = setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['admission'] })
        }, delay)

        return () => clearTimeout(timer)
    }, [nextFreeAt, queryClient])
}
