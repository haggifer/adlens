import type { CreateJobInput, Job, Quota } from 'adlens-shared'
import api from '@/api/client'

export interface CreateJobResult {
    job: Job
    uploadUrl: string
}

export const createJob = async (input: CreateJobInput): Promise<CreateJobResult> => {
    const { data } = await api.post<CreateJobResult>('/v1/jobs', input)
    return data
}

export const startAnalysis = async (jobId: string): Promise<Job> => {
    const { data } = await api.post<{ job: Job }>(`/v1/jobs/${jobId}/analyze`)
    return data.job
}

export const getJob = async (jobId: string): Promise<Job> => {
    const { data } = await api.get<{ job: Job }>(`/v1/jobs/${jobId}`)
    return data.job
}

export const getQuota = async (): Promise<Quota> => {
    const { data } = await api.get<{ quota: Quota }>('/v1/me/quota')
    return data.quota
}
