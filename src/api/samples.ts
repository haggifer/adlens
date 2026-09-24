import type { Sample, SampleListResponse } from 'adlens-shared'
import api from '@/api/client'

export const listSamples = async (): Promise<Sample[]> => {
    const { data } = await api.get<SampleListResponse>('/v1/samples')

    return data.samples
}
