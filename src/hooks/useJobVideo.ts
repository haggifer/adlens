import type { ApiRequestError } from '@/api/errors'
import { getJobVideo } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { type JobVideoResponse, RequestErrorCode } from 'adlens-shared'

export interface UseJobVideoResult {
    url: string | undefined
    // The API answers the replay request with a 404 once the job has no video left to play.
    isMissing: boolean
}

// The API signs a replay URL for 2 hours. A seek into a part of the video not loaded yet needs the URL still valid, and
// swapping the URL would restart the player, so an open page keeps its URL (no refetch on focus or reconnect) and only a
// page opened again past this age asks for a new one, with an hour or more left on it.
const VIDEO_URL_STALE_MS = 60 * 60 * 1000

export function useJobVideo(jobId: string, isEnabled: boolean): UseJobVideoResult {
    const { user } = useAuth()
    const { data, error } = useQuery<JobVideoResponse, ApiRequestError>({
        queryKey: ['jobVideo', user?.id, jobId],
        queryFn: () => getJobVideo(jobId),
        enabled: Boolean(user) && isEnabled,
        staleTime: VIDEO_URL_STALE_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    })

    return { url: data?.url, isMissing: error?.code === RequestErrorCode.NotFound }
}
