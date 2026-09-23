import type {
    CreateJobInput,
    CreateJobResponse,
    Job,
    JobListResponse,
    JobResponse,
    JobVideoResponse,
} from 'adlens-shared'
import api from '@/api/client'

export const JOBS_PAGE_SIZE = 20

export const createJob = async (input: CreateJobInput): Promise<CreateJobResponse> => {
    const { data } = await api.post<CreateJobResponse>('/v1/jobs', input)

    return data
}

export const startAnalysis = async (jobId: string): Promise<Job> => {
    const { data } = await api.post<JobResponse>(`/v1/jobs/${jobId}/analyze`)

    return data.job
}

export const getJob = async (jobId: string): Promise<Job> => {
    const { data } = await api.get<JobResponse>(`/v1/jobs/${jobId}`)

    return data.job
}

export const listJobs = async (cursor: string | null): Promise<JobListResponse> => {
    const { data } = await api.get<JobListResponse>('/v1/jobs', {
        params: { limit: JOBS_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
    })

    return data
}

export const getJobVideo = async (jobId: string): Promise<JobVideoResponse> => {
    const { data } = await api.get<JobVideoResponse>(`/v1/jobs/${jobId}/video`)

    return data
}
