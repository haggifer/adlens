import type { ApiRequestError } from '@/api/errors'
import { getJob } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { config } from '@/config'
import { isJobInProgress } from '@/job-status'
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Job, JobStatus } from 'adlens-shared'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export interface UseJobResult {
    job: Job | undefined
    isLoading: boolean
    error: ApiRequestError | null
    // The page can't reach the API about a running job (its live connection or its last read failed): the status
    // shown may be out of date.
    isDisconnected: boolean
}

// The API expires an abandoned analysis only when its owner reads their jobs, and an abandoned job sends no updates,
// so a running job is also read on this interval: whatever went wrong shows within it. A read is a few indexed lookups.
const IN_PROGRESS_POLL_MS = 10 * 1000

// The API refunds a failed run just after it marks the job failed, so a quota read right away may still count it.
const REFUND_SETTLE_MS = 2 * 1000

const invalidateLimits = (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: ['quota'] })
    void queryClient.invalidateQueries({ queryKey: ['admission'] })
}

export const jobKey = (userId: string | undefined, jobId: string) => ['job', userId, jobId]

// Reads the job once, then keeps it live over Socket.IO (fed by the API's Mongo change stream) by writing pushed
// updates into the query cache. Every (re)connect refetches, because updates emitted while disconnected are lost.
// The socket stays open only while the job is in progress: Cloud Run bills an instance for as long as any WebSocket
// is open, so a tab left on a finished analysis would otherwise keep one running.
export function useJob(jobId: string): UseJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const [hasLostConnection, setHasLostConnection] = useState(false)
    // The status last shown, to tell a job that fails while watched from one opened after it had failed.
    const [shownStatus, setShownStatus] = useState<JobStatus | undefined>(undefined)
    const [hasFailedWhileWatched, setHasFailedWhileWatched] = useState(false)

    const userId = user?.id
    const { data, isLoading, error, isRefetchError } = useQuery<Job, ApiRequestError>({
        queryKey: jobKey(userId, jobId),
        queryFn: () => getJob(jobId),
        enabled: Boolean(userId),
        refetchInterval: (query) =>
            query.state.data && isJobInProgress(query.state.data.status) ? IN_PROGRESS_POLL_MS : false,
    })

    const status = data?.status
    const isLive = Boolean(userId && status && isJobInProgress(status))
    const isDisconnected = isLive && (hasLostConnection || isRefetchError)

    if (status !== shownStatus) {
        setShownStatus(status)

        if (status === JobStatus.Error && shownStatus) {
            setHasFailedWhileWatched(true)
        }
    }

    useEffect(() => {
        if (!isLive) {
            return
        }

        const socket = io(config.apiBaseUrl, { withCredentials: true, transports: ['websocket'] })

        // Socket.IO keeps reconnecting on its own; these only track whether it is through.
        socket.on('connect_error', () => setHasLostConnection(true))
        socket.on('disconnect', (reason) => setHasLostConnection(reason !== 'io client disconnect'))
        socket.on('connect', () => {
            setHasLostConnection(false)
            void queryClient.invalidateQueries({ queryKey: jobKey(userId, jobId) })
        })
        socket.on('job:updated', (job: Job) => {
            if (job.id === jobId) {
                queryClient.setQueryData(jobKey(userId, jobId), job)
            }
        })

        return () => {
            socket.disconnect()
        }
    }, [isLive, jobId, userId, queryClient])

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
