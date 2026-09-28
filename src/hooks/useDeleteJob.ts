import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteJob } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { jobKey } from '@/hooks/useJob'

export interface UseDeleteJobResult {
    deleteJob: (jobId: string) => Promise<void>
    isDeleting: boolean
}

export function useDeleteJob(): UseDeleteJobResult {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const userId = user?.id
    const { mutateAsync, isPending } = useMutation({
        mutationFn: (jobId: string) => deleteJob(jobId),
        onSuccess: (_, jobId) => {
            void queryClient.invalidateQueries({ queryKey: ['jobs', userId] })
            // The page showing the job may still be mounted while it navigates away; removing its query now would
            // refetch a job that no longer exists.
            queryClient.removeQueries({ queryKey: jobKey(userId, jobId), type: 'inactive' })
        },
    })

    return { deleteJob: mutateAsync, isDeleting: isPending }
}
