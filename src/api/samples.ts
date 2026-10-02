import { api } from '@/api/client'
import type { Sample, SampleListResponse } from 'adlens-shared'

export const listSamples = async (): Promise<Sample[]> => {
    const { data } = await api.get<SampleListResponse>('/v1/samples')

    return data.samples
}
