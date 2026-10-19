'use client'

import { JOB_STATUS_COLORS, JOB_STATUS_LABELS } from '@/labels'
import { type AdminJob, type AdminUser, JobStatus } from 'adlens-shared'
import { Table, type TableColumnsType, type TableColumnType, Tag, Tooltip, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { filterJobRows, type JobFilter, NO_JOB_FILTER } from './admin-job-filter'
import { ANONYMOUS_EMAIL, getCreatedColumn, TABLE_PAGINATION } from './admin-table'
import { type AdminJobRow, formatTokenTally, hasOtherInput, toJobRows, TokenKind } from './admin-usage'
import { formatMs } from './format-duration'
import { JobFilters } from './JobFilters'
import { formatCost } from './model-pricing'

export const UNKNOWN_OWNER_TIP = 'The users couldn’t be read, so the owner is unknown'

export const NO_SUCH_OWNER_TIP = 'No such user: a demo job, or a user deleted since'

const TOKEN_COLUMN_WIDTH = 160

const LOCALE = { emptyText: 'No jobs' }

// Wider than the page: it scrolls sideways rather than squeezing the columns.
const SCROLL = { x: 'max-content' }

const JOB_STATUS_ORDER = Object.values(JobStatus)

// Sorts jobs without recorded calls below every job that has them, zero tokens included.
const getTokens = (row: AdminJobRow, kind: TokenKind) => row.usage?.byKind[kind].tokens ?? -1

// Labelled too, so a screen reader hears the reason a tooltip shows on hover.
const renderDash = (tip: string) => (
    <Tooltip title={tip}>
        <span aria-label={tip}>—</span>
    </Tooltip>
)

const renderMissing = (row: AdminJobRow) =>
    row.isUnrecorded ? renderDash('Ran before each Gemini call was recorded: only its token totals were kept') : '—'

const renderDuration = (row: AdminJobRow) => {
    if (!row.usage) {
        return renderMissing(row)
    }

    return row.usage.durationMs === undefined
        ? renderDash('Ran before each Gemini call was timed')
        : formatMs(row.usage.durationMs)
}

const renderUserEmail = ({ user }: AdminJobRow, isUserListMissing: boolean) => {
    if (isUserListMissing) {
        return renderDash(UNKNOWN_OWNER_TIP)
    }

    if (!user) {
        return renderDash(NO_SUCH_OWNER_TIP)
    }

    return user.email ?? <Typography.Text type="secondary">{ANONYMOUS_EMAIL}</Typography.Text>
}

const getTokenColumn = (title: string, kind: TokenKind): TableColumnType<AdminJobRow> => ({
    title,
    key: kind,
    width: TOKEN_COLUMN_WIDTH,
    sorter: (a, b) => getTokens(a, kind) - getTokens(b, kind),
    render: (_, row) => (row.usage ? formatTokenTally(row.usage.byKind[kind]) : renderMissing(row)),
})

const getColumns = (isOtherInputShown: boolean, isUserListMissing: boolean): TableColumnsType<AdminJobRow> => [
    getCreatedColumn((row) => row.job.createdAt),
    {
        title: 'Name',
        key: 'name',
        width: 240,
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_, row) => (
            <>
                {row.job.sampleId && <Tag>Sample</Tag>}
                {row.name}
            </>
        ),
    },
    {
        title: 'Status',
        key: 'status',
        width: 130,
        sorter: (a, b) => JOB_STATUS_ORDER.indexOf(a.job.status) - JOB_STATUS_ORDER.indexOf(b.job.status),
        render: (_, row) => <Tag color={JOB_STATUS_COLORS[row.job.status]}>{JOB_STATUS_LABELS[row.job.status]}</Tag>,
    },
    {
        title: 'User email',
        key: 'userEmail',
        width: 220,
        ellipsis: true,
        sorter: (a, b) => (a.user?.email ?? '').localeCompare(b.user?.email ?? ''),
        render: (_, row) => renderUserEmail(row, isUserListMissing),
    },
    {
        title: 'User id',
        key: 'userId',
        width: 250,
        sorter: (a, b) => a.job.userId.localeCompare(b.job.userId),
        render: (_, row) => <Typography.Text copyable>{row.job.userId}</Typography.Text>,
    },
    getTokenColumn('Video input', TokenKind.VideoInput),
    getTokenColumn('Audio input', TokenKind.AudioInput),
    getTokenColumn('Text input', TokenKind.TextInput),
    ...(isOtherInputShown ? [getTokenColumn('Other input', TokenKind.OtherInput)] : []),
    getTokenColumn('Cached input', TokenKind.CachedInput),
    getTokenColumn('Thinking', TokenKind.Thinking),
    getTokenColumn('Output', TokenKind.Output),
    {
        title: 'Cost',
        key: 'cost',
        width: 100,
        sorter: (a, b) => (a.usage?.usd ?? -1) - (b.usage?.usd ?? -1),
        render: (_, row) => (row.usage ? formatCost(row.usage.usd) : renderMissing(row)),
    },
    {
        title: 'AI duration',
        key: 'duration',
        width: 110,
        sorter: (a, b) => (a.usage?.durationMs ?? -1) - (b.usage?.durationMs ?? -1),
        render: (_, row) => renderDuration(row),
    },
]

interface IProps {
    jobs: AdminJob[]
    // Every user, for each job's owner.
    users: AdminUser[]
    // The users query failed: no owner can be told apart from a deleted one.
    isUserListMissing?: boolean
    isLoading?: boolean
}

export function JobsTable({ jobs, users, isUserListMissing = false, isLoading }: IProps) {
    const [filter, setFilter] = useState<JobFilter>(NO_JOB_FILTER)

    const rows = useMemo(() => toJobRows(jobs, users), [jobs, users])
    const shownRows = useMemo(() => filterJobRows(rows, filter), [rows, filter])
    // From every job, so the columns don't change with the filter.
    const columns = getColumns(hasOtherInput(rows.map((row) => row.usage)), isUserListMissing)

    return (
        <>
            <JobFilters filter={filter} onChange={setFilter} shownCount={shownRows.length} totalCount={rows.length} />
            <Table<AdminJobRow>
                size="small"
                rowKey={(row) => row.job.id}
                loading={isLoading}
                columns={columns}
                dataSource={shownRows}
                pagination={TABLE_PAGINATION}
                tableLayout="fixed"
                scroll={SCROLL}
                locale={LOCALE}
            />
        </>
    )
}
