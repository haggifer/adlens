import { api } from '@/api/client'
import type { Demo, DemoListResponse } from 'adlens-shared'

export const listDemos = async (): Promise<Demo[]> => {
    const { data } = await api.get<DemoListResponse>('/v1/demos')

    return data.demos
}
