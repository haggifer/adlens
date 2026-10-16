import { api } from '@/api/client'
import type { LiveTokenRequest, LiveTokenResponse } from 'adlens-shared'

export const getLiveToken = async (): Promise<LiveTokenRequest | null> => {
    const { data } = await api.get<LiveTokenResponse>('/v1/live/token')

    return data.tokenRequest
}
