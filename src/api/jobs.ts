import { api } from '@/api/client'
import { toApiRequestError } from '@/api/errors'
import {
    type CreateJobInput,
    type CreateJobResponse,
    type CreateSampleJobInput,
    type Job,
    type JobListResponse,
    type JobResponse,
    type JobVideoResponse,
    RequestErrorCode,
} from 'adlens-shared'

const JOBS_PAGE_SIZE = 20

// What creating a job refuses before anything is charged: the quota and network limits.
const ADMISSION_REFUSALS: RequestErrorCode[] = [
    RequestErrorCode.SignUpRequired,
    RequestErrorCode.EmailConfirmationRequired,
    RequestErrorCode.QuotaExceeded,
    RequestErrorCode.NetworkQuotaExceeded,
]

export const isAdmissionRefusal = (code: string): code is RequestErrorCode =>
    ADMISSION_REFUSALS.includes(code as RequestErrorCode)

// The refusal a new analysis would meet, or null when it would be admitted. The API answers with the same error
// creating the job would, so only those errors become a value; any other failure stays a failure.
export const getAdmissionRefusal = async (): Promise<RequestErrorCode | null> => {
    try {
        await api.get('/v1/admission')

        return null
    } catch (err) {
        const { code } = toApiRequestError(err)

        if (isAdmissionRefusal(code)) {
            return code
        }

        throw err
    }
}

export const createJob = async (input: CreateJobInput): Promise<CreateJobResponse> => {
    const { data } = await api.post<CreateJobResponse>('/v1/jobs', input)

    return data
}

export const createSampleJob = async (input: CreateSampleJobInput): Promise<Job> => {
    const { data } = await api.post<JobResponse>('/v1/jobs/from-sample', input)

    return data.job
}

export const startAnalysis = async (jobId: string): Promise<Job> => {
    const { data } = await api.post<JobResponse>(`/v1/jobs/${jobId}/analyze`)

    return data.job
}

export const restartJob = async (jobId: string): Promise<Job> => {
    const { data } = await api.post<JobResponse>(`/v1/jobs/${jobId}/restart`)

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

export const deleteJob = async (jobId: string): Promise<void> => {
    await api.delete(`/v1/jobs/${jobId}`)
}

export const getJobVideo = async (jobId: string): Promise<JobVideoResponse> => {
    const { data } = await api.get<JobVideoResponse>(`/v1/jobs/${jobId}/video`)

    return data
}
