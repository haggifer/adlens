import { restartJob } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { jobKey } from '@/hooks/useJob'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Job, JobStatus } from 'adlens-shared'

export interface UseRestartJobResult {
    restartJob: (job: Job) => Promise<Job>
    isRestarting: boolean
}

// The API answers only once the run is verified, charged and started, but claims the job first: the page shows the run
// in its first step at once, and a refused restart puts the failed job back until the read brings the job as it is.
export function useRestartJob(): UseRestartJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const userId = user?.id
    const { mutateAsync, isPending } = useMutation({
        mutationFn: (job: Job) => restartJob(job.id),
        onMutate: (job) => {
            queryClient.setQueryData<Job>(jobKey(userId, job.id), {
                ...job,
                status: JobStatus.Verifying,
                errorCode: undefined,
            })
        },
        onError: (_error, job) => {
            queryClient.setQueryData(jobKey(userId, job.id), job)
        },
        onSettled: (_data, _error, job) => {
            void queryClient.invalidateQueries({ queryKey: jobKey(userId, job.id) })
            void queryClient.invalidateQueries({ queryKey: ['jobs', userId] })
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['admission'] })
            // The server may have counted the run towards its preset.
            void queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] })
        },
    })

    return { restartJob: mutateAsync, isRestarting: isPending }
}
