'use client'

import type { Job } from 'adlens-shared'
import { Alert, Button, Empty, Table, type TableColumnsType, Tag } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useJobs from '@/hooks/useJobs'
import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, PLATFORM_LABELS } from '@/labels'
import { useStyles } from './styles'

const COLUMNS: TableColumnsType<Job> = [
    {
        title: 'Video',
        key: 'file',
        render: (_, job) => (
            <span className="d-inline-flex align-items-center gap-2">
                <Link href={`/analyses/${job.id}`}>{job.file.name}</Link>
                {job.sampleId && <Tag color="processing">Sample</Tag>}
            </span>
        ),
    },
    {
        title: 'Platforms',
        key: 'platforms',
        responsive: ['md'],
        render: (_, job) =>
            job.settings.platforms.length
                ? job.settings.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ')
                : 'General rules',
    },
    {
        title: 'Status',
        key: 'status',
        render: (_, job) => <Tag color={JOB_STATUS_COLORS[job.status]}>{JOB_STATUS_LABELS[job.status]}</Tag>,
    },
    {
        title: 'Created',
        key: 'createdAt',
        responsive: ['sm'],
        render: (_, job) => new Date(job.createdAt).toLocaleString(),
    },
]

export default function HistoryTable() {
    const { styles } = useStyles()
    const router = useRouter()
    const { jobs, isLoading, error, hasMore, isLoadingMore, loadMore } = useJobs()

    return (
        <section className={styles.page}>
            <h1 className={styles.pageTitle}>History</h1>
            {error && <Alert type="error" showIcon title={error.message} />}
            <Table<Job>
                rowKey="id"
                columns={COLUMNS}
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
