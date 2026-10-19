import { listAdminUsers } from '@/api/admin'
import type { ApiRequestError } from '@/api/errors'
import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { ADMIN_QUERY_KEY } from '@/hooks/useAdminJobs'
import { useQuery } from '@tanstack/react-query'
import type { AdminUser } from 'adlens-shared'

export interface UseAdminUsersResult {
    users: AdminUser[]
    isLoading: boolean
    error: ApiRequestError | null
}

const NO_USERS: AdminUser[] = []

export function useAdminUsers(): UseAdminUsersResult {
    const { user, accountKind } = useAuth()

    const { data, isLoading, error } = useQuery({
        queryKey: [ADMIN_QUERY_KEY, user?.id, 'users'],
        queryFn: listAdminUsers,
        enabled: accountKind === AccountKind.Admin,
    })

    return { users: data ?? NO_USERS, isLoading, error: error as ApiRequestError | null }
}
