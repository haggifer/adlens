import type { Job } from 'adlens-types'
import api from '@/api/client'

// Mirrors the proposed adlens-types AnalysisSettings; move there once the package ships it.
export interface AnalysisSettings {
    platform: string[]
    objective: string
    focus: string[]
    audience?: string
    brand?: string
}

interface CreateJobInput {
    settings: AnalysisSettings
    file: {
        name: string
        contentType: string
        size: number
    }
}

export const createJob = async (input: CreateJobInput): Promise<Job> => {
    const { data } = await api.post<{ job: Job }>('/v1/jobs', input)
    return data.job
}

export const startAnalysis = async (jobId: string): Promise<Job> => {
    const { data } = await api.post<{ job: Job }>(`/v1/jobs/${jobId}/analyze`)
    return data.job
}
