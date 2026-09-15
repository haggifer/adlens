import { useQuery } from '@tanstack/react-query'
import type { Quota } from 'adlens-shared'
import { getQuota } from '@/api/jobs'

export interface UseQuotaResult {
    quota: Quota | undefined
}

export const useQuota = (enabled: boolean): UseQuotaResult => {
    const { data } = useQuery({ queryKey: ['quota'], queryFn: getQuota, enabled })

    return { quota: data }
}
