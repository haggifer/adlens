import { api } from '@/api/client'
import type { Quota, QuotaResponse } from 'adlens-shared'

export const getQuota = async (): Promise<Quota> => {
    const { data } = await api.get<QuotaResponse>('/v1/me/quota')

    return data.quota
}

export const getVisitorQuota = async (): Promise<Quota> => {
    const { data } = await api.get<QuotaResponse>('/v1/quota/visitor')

    return data.quota
}
