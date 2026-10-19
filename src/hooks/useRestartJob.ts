import { restartJob } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { jobKey } from '@/hooks/useJob'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Job } from 'adlens-shared'

export interface UseRestartJobResult {
    // Resolves with the new job that runs the failed one again.
    restartJob: (jobId: string) => Promise<Job>
    isRestarting: boolean
}

export function useRestartJob(): UseRestartJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const userId = user?.id
    const { mutateAsync, isPending } = useMutation({
        mutationFn: (jobId: string) => restartJob(jobId),
        onSuccess: (job) => {
            queryClient.setQueryData(jobKey(userId, job.id), job)
            // The server may have counted the run towards its preset.
            void queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] })
        },
        // Even a refused restart may have created the new job (its start failed after the video check), and the
        // failed one now names it.
        onSettled: (_job, _error, jobId) => {
            void queryClient.invalidateQueries({ queryKey: jobKey(userId, jobId) })
            void queryClient.invalidateQueries({ queryKey: ['jobs', userId] })
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['admission'] })
        },
    })

    return { restartJob: mutateAsync, isRestarting: isPending }
}
