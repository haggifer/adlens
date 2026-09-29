import { JobStatus } from 'adlens-shared'

// The API is working on a job in these states: it refuses to delete it, and only these can still change on their own.
// A pending job waits for its owner's upload, which the analysis page never shows in progress.
const IN_PROGRESS: JobStatus[] = [JobStatus.Verifying, JobStatus.Queued, JobStatus.Analyzing]

export const isJobInProgress = (status: JobStatus) => IN_PROGRESS.includes(status)
