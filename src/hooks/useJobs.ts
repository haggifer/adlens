import type { ApiRequestError } from '@/api/errors'
import { listJobs } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { Job } from 'adlens-shared'

export interface UseJobsResult {
    jobs: Job[]
    isLoading: boolean
    error: ApiRequestError | null
    hasMore: boolean
    isLoadingMore: boolean
    loadMore: () => void
}

export function useJobs(): UseJobsResult {
    const { user } = useAuth()
    const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['jobs', user?.id],
        queryFn: ({ pageParam }) => listJobs(pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: Boolean(user),
    })

    return {
        jobs: data?.pages.flatMap((page) => page.jobs) ?? [],
        isLoading,
        error: error as ApiRequestError | null,
        hasMore: hasNextPage,
        isLoadingMore: isFetchingNextPage,
        loadMore: () => void fetchNextPage(),
    }
}
