import type { CreateJobInput, Job } from 'adlens-shared'
import api from '@/api/client'

export const createJob = async (input: CreateJobInput): Promise<Job> => {
    const { data } = await api.post<{ job: Job }>('/v1/jobs', input)
    return data.job
}

export const startAnalysis = async (jobId: string): Promise<Job> => {
    const { data } = await api.post<{ job: Job }>(`/v1/jobs/${jobId}/analyze`)
    return data.job
}
