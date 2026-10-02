import { useQuery } from '@tanstack/react-query'
import { type JobVideoResponse, RequestErrorCode } from 'adlens-shared'
import type { ApiRequestError } from '@/api/errors'
import { getJobVideo } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'

// Signed URLs live 15 minutes. A ≤60 s clip is buffered long before that, and swapping the URL would restart the
// player, so the link is only refreshed when the page is opened again after it went stale.
const VIDEO_URL_STALE_MS = 10 * 60 * 1000

export interface UseJobVideoResult {
    url: string | undefined
    // The API answers the replay request with a 404 once the job has no video left to play.
    isMissing: boolean
}

export function useJobVideo(jobId: string, isEnabled: boolean): UseJobVideoResult {
    const { user } = useAuth()
    const { data, error } = useQuery<JobVideoResponse, ApiRequestError>({
        queryKey: ['jobVideo', user?.id, jobId],
        queryFn: () => getJobVideo(jobId),
        enabled: Boolean(user) && isEnabled,
        staleTime: VIDEO_URL_STALE_MS,
    })

    return { url: data?.url, isMissing: error?.code === RequestErrorCode.NotFound }
}
