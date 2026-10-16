import { getAdmissionRefusal } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { useQuery } from '@tanstack/react-query'
import type { RequestErrorCode } from 'adlens-shared'

export interface UseAdmissionResult {
    // The refusal a new analysis would meet: null when it would be admitted, undefined until the API has answered.
    refusal: RequestErrorCode | null | undefined
    // When that answer arrived (0 before any), so a run refused earlier knows a newer answer replaced it.
    updatedAt: number
    // The API couldn't answer (unreachable or failing), so no analysis can start. It holds while asking again.
    isUnavailable: boolean
    // The first ask failed and is being retried: whether the API can answer isn't known yet.
    isRecovering: boolean
    isRetrying: boolean
    retry: () => void
}

export const admissionKey = (userId: string | undefined) => ['admission', userId ?? 'visitor']

// Asks the API in advance whether a new analysis would be admitted, for a visitor without a session too, so Run can be
// disabled before a refusal. Kept in the query cache per user: a run, a sign-in or a sign-out refreshes it.
export function useAdmission(): UseAdmissionResult {
    const { user, isInitializing } = useAuth()

    const { data, dataUpdatedAt, errorUpdatedAt, failureCount, isFetching, refetch } = useQuery({
        queryKey: admissionKey(user?.id),
        queryFn: getAdmissionRefusal,
        enabled: !isInitializing,
    })

    // Not `error`: a query that never had data drops its error as soon as it fetches again.
    const isUnavailable = errorUpdatedAt > dataUpdatedAt
    const isRecovering = dataUpdatedAt === 0 && failureCount > 0 && !isUnavailable

    return {
        refusal: data,
        updatedAt: dataUpdatedAt,
        isUnavailable,
        isRecovering,
        isRetrying: isFetching,
        retry: () => void refetch(),
    }
}
