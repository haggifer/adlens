import { getQuota, getVisitorQuota } from '@/api/me'
import { useAuth } from '@/auth/AuthContext'
import { useQuery } from '@tanstack/react-query'
import type { Quota } from 'adlens-shared'

export interface UseQuotaResult {
    quota: Quota | undefined
}

const VISITOR_QUOTA_KEY = ['quota', 'visitor']

const quotaKey = (userId: string | undefined) => ['quota', userId]

// A visitor without a session gets what their first analysis would allow; while the session loads, nothing.
export function useQuota(): UseQuotaResult {
    const { user, isInitializing } = useAuth()

    const isVisitor = !user && !isInitializing

    const { data: userQuota } = useQuery({ queryKey: quotaKey(user?.id), queryFn: getQuota, enabled: Boolean(user) })
    const { data: visitorQuota } = useQuery({
        queryKey: VISITOR_QUOTA_KEY,
        queryFn: getVisitorQuota,
        enabled: isVisitor,
        staleTime: Infinity,
    })

    if (user) {
        return { quota: userQuota }
    }

    return { quota: isVisitor ? visitorQuota : undefined }
}
