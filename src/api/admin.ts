import { api } from '@/api/client'
import type { AdminJob, AdminJobsResponse, AdminUser, AdminUsersResponse } from 'adlens-shared'

export const listAdminJobs = async (): Promise<AdminJob[]> => {
    const { data } = await api.get<AdminJobsResponse>('/v1/admin/jobs')

    return data.jobs
}

export const listAdminUsers = async (): Promise<AdminUser[]> => {
    const { data } = await api.get<AdminUsersResponse>('/v1/admin/users')

    return data.users
}
