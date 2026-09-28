import { useQuery } from '@tanstack/react-query'
import type { Quota } from 'adlens-shared'
import { getQuota } from '@/api/me'
import { useAuth } from '@/auth/AuthContext'

export const quotaKey = (userId: string | undefined) => ['quota', userId]

export interface UseQuotaResult {
    quota: Quota | undefined
}

export function useQuota(): UseQuotaResult {
    const { user } = useAuth()
    const { data } = useQuery({ queryKey: quotaKey(user?.id), queryFn: getQuota, enabled: Boolean(user) })

    return { quota: data }
}
