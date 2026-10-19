import { listAdminJobs } from '@/api/admin'
import type { ApiRequestError } from '@/api/errors'
import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { useQuery } from '@tanstack/react-query'
import type { AdminJob } from 'adlens-shared'

export interface UseAdminJobsResult {
    jobs: AdminJob[]
    isLoading: boolean
    error: ApiRequestError | null
}

// The first part of both admin reads' keys, so Reload refreshes them together.
export const ADMIN_QUERY_KEY = 'admin'

const NO_JOBS: AdminJob[] = []

export function useAdminJobs(): UseAdminJobsResult {
    const { user, accountKind } = useAuth()

    const { data, isLoading, error } = useQuery({
        queryKey: [ADMIN_QUERY_KEY, user?.id, 'jobs'],
        queryFn: listAdminJobs,
        enabled: accountKind === AccountKind.Admin,
    })

    return { jobs: data ?? NO_JOBS, isLoading, error: error as ApiRequestError | null }
}
