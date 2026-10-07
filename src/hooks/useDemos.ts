import { listDemos } from '@/api/demos'
import type { ApiRequestError } from '@/api/errors'
import { useQuery } from '@tanstack/react-query'
import type { Demo } from 'adlens-shared'

export interface UseDemosResult {
    demos: Demo[]
    isLoading: boolean
    error: ApiRequestError | null
}

// Video URLs are signed for 15 minutes; refetching after 10 keeps the players loadable.
const DEMOS_STALE_MS = 10 * 60 * 1000

// Public data, the same for everyone, so the key isn't user-scoped.
export function useDemos(): UseDemosResult {
    const { data, isLoading, error } = useQuery<Demo[], ApiRequestError>({
        queryKey: ['demos'],
        queryFn: listDemos,
        staleTime: DEMOS_STALE_MS,
    })

    return { demos: data ?? [], isLoading, error }
}
