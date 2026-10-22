import type { Dayjs } from 'dayjs'
import type { AdminJobRow } from './admin-usage'

// Jobs created from `from` to `to`, both included, in epoch milliseconds. No `to`: up to now, whenever the jobs are
// read, so jobs created after the period was picked show on Reload.
export interface JobPeriod {
    from: number
    to: number | null
}

interface JobPeriodPreset {
    label: string
    getFrom: (now: Dayjs) => Dayjs
}

// An empty field matches every job.
export interface JobFilter {
    // Part of the owner's email, in any case.
    email: string
    // Part of the owner's id.
    userId: string
    period: JobPeriod | null
}

export const NO_JOB_FILTER: JobFilter = { email: '', userId: '', period: null }

// Each runs up to now; "Last N days" is the rolling window.
export const JOB_PERIOD_PRESETS: JobPeriodPreset[] = [
    { label: 'Today', getFrom: (now) => now.startOf('day') },
    { label: 'Last 7 days', getFrom: (now) => now.subtract(7, 'day') },
    { label: 'Last 30 days', getFrom: (now) => now.subtract(30, 'day') },
    { label: 'This month', getFrom: (now) => now.startOf('month') },
]

// A job without a known owner (a demo, or a user deleted since) has no email, so an email filter hides it.
const matchesEmail = (row: AdminJobRow, email: string) =>
    !email || Boolean(row.user?.email?.toLowerCase().includes(email))

const matchesUserId = (row: AdminJobRow, userId: string) => !userId || row.job.userId.includes(userId)

const matchesPeriod = (row: AdminJobRow, period: JobPeriod | null) => {
    if (!period) {
        return true
    }

    const createdAt = Date.parse(row.job.createdAt)

    return createdAt >= period.from && (period.to === null || createdAt <= period.to)
}

// To the minute the picker shows, both ends included. An end in the minute of picking (every preset's) stays open.
export const toJobPeriod = (from: Dayjs, to: Dayjs, now: Dayjs): JobPeriod => ({
    from: from.startOf('minute').valueOf(),
    to: to.isSame(now, 'minute') ? null : to.endOf('minute').valueOf(),
})

export const isJobFilterActive = ({ email, userId, period }: JobFilter): boolean =>
    Boolean(email.trim() || userId.trim() || period)

export const filterJobRows = (rows: AdminJobRow[], { email, userId, period }: JobFilter): AdminJobRow[] => {
    const emailQuery = email.trim().toLowerCase()
    const userIdQuery = userId.trim()

    return rows.filter(
        (row) => matchesEmail(row, emailQuery) && matchesUserId(row, userIdQuery) && matchesPeriod(row, period),
    )
}
