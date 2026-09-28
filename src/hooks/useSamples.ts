import { useQuery } from '@tanstack/react-query'
import type { Sample } from 'adlens-shared'
import type { ApiRequestError } from '@/api/errors'
import { listSamples } from '@/api/samples'

// Preview URLs are signed for 15 minutes; refetching after 10 keeps the list's players loadable.
const SAMPLES_STALE_MS = 10 * 60 * 1000

export interface UseSamplesResult {
    samples: Sample[]
    isLoading: boolean
    error: ApiRequestError | null
}

// Public data, so the key isn't user-scoped; it loads only once the picker opens.
export function useSamples(isEnabled: boolean): UseSamplesResult {
    const { data, isLoading, error } = useQuery<Sample[], ApiRequestError>({
        queryKey: ['samples'],
        queryFn: listSamples,
        enabled: isEnabled,
        staleTime: SAMPLES_STALE_MS,
    })

    return { samples: data ?? [], isLoading, error }
}
