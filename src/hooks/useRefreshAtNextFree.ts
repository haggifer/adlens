import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// Asked a little after the moment, so the API's clock has passed it too.
const NEXT_FREE_GRACE_MS = 5_000

// Asked again after each of these while the answer still names the same moment: a client clock running ahead of the
// API's gets there first. A new answer re-runs the effect, which drops them; past the last, a run or a reload asks.
const RETRY_DELAYS_MS = [30_000, 60_000, 120_000]

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

        let retries = 0
        let timer: ReturnType<typeof setTimeout>

        // By prefix, as after a run: the quota and the admission answer are kept per user.
        const refresh = () => {
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['admission'] })

            if (retries < RETRY_DELAYS_MS.length) {
                timer = setTimeout(refresh, RETRY_DELAYS_MS[retries])
                retries += 1
            }
        }

        timer = setTimeout(refresh, delay)

        return () => clearTimeout(timer)
    }, [nextFreeAt, queryClient])
}
