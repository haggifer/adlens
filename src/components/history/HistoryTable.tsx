'use client'

import type { Job } from 'adlens-shared'
import { Alert, Button, Empty, Table, type TableColumnsType, Tag } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MouseEvent } from 'react'
import { DeleteJobButton } from '@/components/analysis/DeleteJobButton'
import { useJobs } from '@/hooks/useJobs'
import { ALL_PLATFORMS_LABEL, JOB_STATUS_COLORS, JOB_STATUS_LABELS, PLATFORM_LABELS } from '@/labels'
import { useStyles } from './styles'

const formatCreatedAt = (job: Job) => new Date(job.createdAt).toLocaleString()

const renderStatus = (job: Job) => <Tag color={JOB_STATUS_COLORS[job.status]}>{JOB_STATUS_LABELS[job.status]}</Tag>

const getColumns = (styles: ReturnType<typeof useStyles>['styles']): TableColumnsType<Job> => [
    {
        title: 'Video',
        key: 'file',
        render: (_, job) => (
            <div className={styles.videoCell}>
                <div className={styles.videoName}>
                    <Link href={`/analyses/${job.id}`} className={styles.videoLink} title={job.file.name}>
                        {job.file.name}
                    </Link>
                    {job.sampleId && <Tag color="processing">Sample</Tag>}
                </div>
                {/* Phones drop the Status and Created columns, so the row carries them under the name. */}
                <div className={styles.compactMeta}>
                    {renderStatus(job)}
                    <span>{formatCreatedAt(job)}</span>
                </div>
            </div>
        ),
    },
    {
        title: 'Platforms',
        key: 'platforms',
        width: '25%',
        responsive: ['lg'],
        render: (_, job) =>
            job.settings.platforms.length
                ? job.settings.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ')
                : ALL_PLATFORMS_LABEL,
    },
    {
        title: 'Status',
        key: 'status',
        width: '8.5rem',
        responsive: ['sm'],
        render: (_, job) => renderStatus(job),
    },
    {
        title: 'Created',
        key: 'createdAt',
        width: '12.5rem',
        responsive: ['sm'],
        render: (_, job) => formatCreatedAt(job),
    },
    {
        title: <span className="visually-hidden">Actions</span>,
        key: 'actions',
        // The 36px icon button plus the cell's 16px side padding.
        width: '4.5rem',
        align: 'right',
        render: (_, job) => <DeleteJobButton job={job} isIconOnly />,
    },
]

export function HistoryTable() {
    const { styles } = useStyles()
    const router = useRouter()
    const { jobs, isLoading, error, hasMore, isLoadingMore, loadMore } = useJobs()

    // The whole row opens the analysis. Clicks on its link or its Delete button are left to them, so a row never
    // navigates twice or opens when deleting.
    const handleRowClick = (event: MouseEvent<HTMLElement>, job: Job) => {
        if ((event.target as HTMLElement).closest('a, button')) {
            return
        }

        router.push(`/analyses/${job.id}`)
    }

    return (
        <section className={styles.page}>
            <h1 className={styles.pageTitle}>History</h1>
            {error && <Alert type="error" showIcon title={error.message} />}
            <Table<Job>
                rowKey="id"
                columns={getColumns(styles)}
                tableLayout="fixed"
                rowClassName={() => styles.row}
                onRow={(job) => ({ onClick: (event) => handleRowClick(event, job) })}
                dataSource={jobs}
                loading={isLoading}
                pagination={false}
                locale={{
                    emptyText: (
                        <Empty description="No analyses yet">
                            <Button type="primary" onClick={() => router.push('/')}>
                                Check your first ad
                            </Button>
                        </Empty>
                    ),
                }}
            />
            {hasMore && (
                <div className="d-flex justify-content-center">
                    <Button loading={isLoadingMore} onClick={loadMore}>
                        Load more
                    </Button>
                </div>
            )}
        </section>
    )
}
