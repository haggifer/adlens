import type { Quota, QuotaResponse } from 'adlens-shared'
import { api } from '@/api/client'

export const getQuota = async (): Promise<Quota> => {
    const { data } = await api.get<QuotaResponse>('/v1/me/quota')

    return data.quota
}
