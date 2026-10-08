import type { ApiRequestError } from '@/api/errors'
import { getJob } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { config } from '@/config'
import { isJobInProgress } from '@/job-status'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Job } from 'adlens-shared'
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

export const jobKey = (userId: string | undefined, jobId: string) => ['job', userId, jobId]

// Reads the job once, then keeps it live over Socket.IO (fed by the API's Mongo change stream) by writing pushed
// updates into the query cache. Every (re)connect refetches, because updates emitted while disconnected are lost.
// The socket stays open only while the job is in progress: Cloud Run bills an instance for as long as any WebSocket
// is open, so a tab left on a finished analysis would otherwise keep one running.
export function useJob(jobId: string): UseJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const [hasLostConnection, setHasLostConnection] = useState(false)

    const userId = user?.id
    const { data, isLoading, error, isRefetchError } = useQuery<Job, ApiRequestError>({
        queryKey: jobKey(userId, jobId),
        queryFn: () => getJob(jobId),
        enabled: Boolean(userId),
        refetchInterval: (query) =>
            query.state.data && isJobInProgress(query.state.data.status) ? IN_PROGRESS_POLL_MS : false,
    })

    const isLive = Boolean(userId && data && isJobInProgress(data.status))
    const isDisconnected = isLive && (hasLostConnection || isRefetchError)

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

    return { job: data, isLoading, error, isDisconnected }
}
