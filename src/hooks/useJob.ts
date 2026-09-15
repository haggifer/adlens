import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Job } from 'adlens-shared'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { getJob } from '@/api/jobs'
import { getBearerToken } from '@/auth/authClient'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

export interface UseJobResult {
    job: Job | undefined
}

// Reads the job once via the API, then keeps it live over Socket.IO (fed by the API's Mongo change
// stream) by writing pushed updates straight into the TanStack Query cache. Replaces the old Firestore
// onSnapshot subscription.
export const useJob = (jobId: string | null): UseJobResult => {
    const queryClient = useQueryClient()
    const { data } = useQuery({
        queryKey: ['job', jobId],
        queryFn: () => getJob(jobId as string),
        enabled: Boolean(jobId),
    })

    useEffect(() => {
        if (!jobId) {
            return
        }

        const socket = io(API_BASE, { auth: { token: getBearerToken() ?? '' }, transports: ['websocket'] })
        socket.on('job:updated', (job: Job) => {
            if (job.id === jobId) {
                queryClient.setQueryData(['job', jobId], job)
            }
        })

        return () => {
            socket.disconnect()
        }
    }, [jobId, queryClient])

    return { job: data }
}
