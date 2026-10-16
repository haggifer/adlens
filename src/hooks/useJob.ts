import type { ApiRequestError } from '@/api/errors'
import { getJob } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { useLiveStore } from '@/contexts/stores/liveStore'
import { isJobInProgress } from '@/job-status'
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Job, JobStatus } from 'adlens-shared'
import { useEffect, useState } from 'react'

export interface UseJobResult {
    job: Job | undefined
    isLoading: boolean
    error: ApiRequestError | null
    // The page can't reach the API about a running job (its live connection or its last read failed): the status
    // shown may be out of date.
    isDisconnected: boolean
}

// The API expires an abandoned analysis only when its owner reads their jobs, and an abandoned job announces nothing,
// so a running job is also read on this interval: whatever went wrong shows within it. A read is a few indexed lookups.
const IN_PROGRESS_POLL_MS = 10 * 1000

// The API refunds a failed run just after it marks the job failed, so a quota read right away may still count it.
const REFUND_SETTLE_MS = 2 * 1000

// A read started before another one may answer after it, describing the job as it was before.
const pickNewer = (cached: Job | undefined, fetched: Job): Job =>
    cached && Date.parse(cached.updatedAt) > Date.parse(fetched.updatedAt) ? cached : fetched

const invalidateLimits = (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ['quota'] })
    void queryClient.invalidateQueries({ queryKey: ['admission'] })
}

export const jobKey = (userId: string | undefined, jobId: string) => ['job', userId, jobId]

// Reads the job, then again whenever the API announces a change to it (useLiveUpdates) and on an interval while it is
// in progress.
export function useJob(jobId: string): UseJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const isConnectionLost = useLiveStore((s) => s.isConnectionLost)

    // The status last shown, to tell a job that fails while watched from one opened after it had failed.
    const [shownStatus, setShownStatus] = useState<JobStatus | undefined>(undefined)
    const [hasFailedWhileWatched, setHasFailedWhileWatched] = useState(false)

    const userId = user?.id
    const { data, isLoading, error, isRefetchError } = useQuery<Job, ApiRequestError>({
        queryKey: jobKey(userId, jobId),
        queryFn: async () => {
            const job = await getJob(jobId)

            return pickNewer(queryClient.getQueryData<Job>(jobKey(userId, jobId)), job)
        },
        enabled: Boolean(userId),
        refetchInterval: (query) =>
            query.state.data && isJobInProgress(query.state.data.status) ? IN_PROGRESS_POLL_MS : false,
    })

    const status = data?.status
    const isInProgress = Boolean(userId && status && isJobInProgress(status))
    const isDisconnected = isInProgress && (isConnectionLost || isRefetchError)

    if (status !== shownStatus) {
        setShownStatus(status)

        if (status === JobStatus.Error && shownStatus) {
            setHasFailedWhileWatched(true)
        }
    }

    // A failed run isn't counted, so the header's count and whether Run is allowed change with it.
    useEffect(() => {
        if (!hasFailedWhileWatched) {
            return
        }

        invalidateLimits(queryClient)
        const timer = setTimeout(() => invalidateLimits(queryClient), REFUND_SETTLE_MS)

        return () => clearTimeout(timer)
    }, [hasFailedWhileWatched, queryClient])

    return { job: data, isLoading, error, isDisconnected }
}
