import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Job } from 'adlens-shared'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { getJob } from '@/api/jobs'
import type { ApiRequestError } from '@/api/errors'
import { useAuth } from '@/auth/AuthContext'
import { config } from '@/config'

export const jobKey = (userId: string | undefined, jobId: string) => ['job', userId, jobId]

export interface UseJobResult {
    job: Job | undefined
    isLoading: boolean
    error: ApiRequestError | null
}

// Reads the job once, then keeps it live over Socket.IO (fed by the API's Mongo change stream) by writing pushed
// updates into the query cache. Every (re)connect refetches, because updates emitted while disconnected are lost.
export default function useJob(jobId: string): UseJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const userId = user?.id
    const { data, isLoading, error } = useQuery<Job, ApiRequestError>({
        queryKey: jobKey(userId, jobId),
        queryFn: () => getJob(jobId),
        enabled: Boolean(userId),
    })

    useEffect(() => {
        if (!userId) {
            return
        }

        const socket = io(config.apiBaseUrl, { withCredentials: true, transports: ['websocket'] })

        socket.on('connect', () => {
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
    }, [jobId, userId, queryClient])

    return { job: data, isLoading, error }
}
