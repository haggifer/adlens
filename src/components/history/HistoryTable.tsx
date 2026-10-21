'use client'

import { DeleteJobButton } from '@/components/analysis/DeleteJobButton'
import { RestartJobButton } from '@/components/analysis/RestartJobButton'
import { useStyles as useAnalysisStyles } from '@/components/analysis/styles'
import { withPlatformPlacements } from '@/components/upload/platform-placements'
import { useJobs } from '@/hooks/useJobs'
import { useNow } from '@/hooks/useNow'
import { usePresets } from '@/hooks/usePresets'
import { RESTART_CLOCK_MS } from '@/job-status'
import {
    ALL_PLACEMENTS_LABEL,
    ALL_PLATFORMS_LABEL,
    formatPlacementLabel,
    JOB_STATUS_COLORS,
    JOB_STATUS_LABELS,
    PLATFORM_COLORS,
    PLATFORM_LABELS,
} from '@/labels'
import { TagFilled } from '@ant-design/icons'
import {
    isJobRestartable,
    type Job,
    type Placement,
    PLACEMENT_PLATFORM,
    type Platform,
    type Preset,
} from 'adlens-shared'
import { Alert, Button, Empty, Table, type TableColumnsType, Tag } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MouseEvent, useMemo } from 'react'
import { useStyles } from './styles'

const formatCreatedAt = (job: Job) => new Date(job.createdAt).toLocaleString()

const renderStatus = (job: Job, now: number) => (
    <span className="d-inline-flex align-items-center gap-1">
        <Tag color={JOB_STATUS_COLORS[job.status]}>{JOB_STATUS_LABELS[job.status]}</Tag>
        {isJobRestartable(job, now) && <RestartJobButton job={job} isIconOnly />}
    </span>
)

const renderPlatformTags = (platforms: Platform[]) =>
    platforms.length ? (
        platforms.map((platform) => (
            <Tag key={platform} color={PLATFORM_COLORS[platform]} title={PLATFORM_LABELS[platform]}>
                {PLATFORM_LABELS[platform]}
            </Tag>
        ))
    ) : (
        <Tag>{ALL_PLATFORMS_LABEL}</Tag>
    )

const renderPlacementTags = (placements: Placement[]) =>
    placements.length ? (
        placements.map((placement) => (
            <Tag
                key={placement}
                color={PLATFORM_COLORS[PLACEMENT_PLATFORM[placement]]}
                title={formatPlacementLabel(placement)}
            >
                {formatPlacementLabel(placement)}
            </Tag>
        ))
    ) : (
        <Tag>{ALL_PLACEMENTS_LABEL}</Tag>
    )

const toNamesById = (presets: Preset[]) => new Map(presets.map((preset) => [preset.id, preset.name]))

// A preset deleted since, or one left behind at sign-in, names no run.
const getPresetName = (job: Job, presetNames: Map<string, string>) =>
    (job.presetId && presetNames.get(job.presetId)) ?? null

const getColumns = (
    styles: ReturnType<typeof useStyles>['styles'],
    presetNames: Map<string, string>,
    now: number,
): TableColumnsType<Job> => [
    {
        title: 'Video',
        key: 'file',
        render: (_, job) => {
            const presetName = getPresetName(job, presetNames)

            return (
                <div className={styles.videoCell}>
                    <div className={styles.videoName}>
                        <Link href={`/analyses/${job.id}`} className={styles.videoLink}>
                            {job.file.name}
                        </Link>
                        {job.sampleId && <Tag color="processing">Sample</Tag>}
                    </div>
                    {/* Phones drop the Status and Created columns, so the row carries them under the name. */}
                    <div className={styles.compactMeta}>
                        {renderStatus(job, now)}
                        <span>{formatCreatedAt(job)}</span>
                    </div>
                    {/* Below lg the Preset column is gone too, so the preset gets its own line. */}
                    {presetName && (
                        <div className={styles.compactPreset}>
                            <Tag color="cyan" icon={<TagFilled aria-hidden />} title={presetName}>
                                {presetName}
                            </Tag>
                        </div>
                    )}
                </div>
            )
        },
    },
    {
        title: 'Platforms',
        key: 'platforms',
        // Fits the longest platform tag at the default font size; a longer one is cut off, with its label on hover.
        width: '13rem',
        responsive: ['lg'],
        render: (_, job) => <div className={styles.tags}>{renderPlatformTags(job.settings.platforms)}</div>,
    },
    {
        title: 'Placements',
        key: 'placements',
        // Fits the longest placement tag at the default font size; a longer one is cut off, with its label on hover.
        width: '15.75rem',
        responsive: ['xl'],
        render: (_, job) => (
            <div className={styles.tags}>
                {renderPlacementTags(withPlatformPlacements(job.settings.platforms, job.settings.placements))}
            </div>
        ),
    },
    {
        title: 'Preset',
        key: 'preset',
        width: '9rem',
        responsive: ['lg'],
        ellipsis: true,
        render: (_, job) => getPresetName(job, presetNames) ?? '—',
    },
    {
        title: 'Status',
        key: 'status',
        width: '8.5rem',
        responsive: ['sm'],
        render: (_, job) => renderStatus(job, now),
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
    const { styles: analysisStyles } = useAnalysisStyles()
    const router = useRouter()
    const now = useNow(RESTART_CLOCK_MS)

    const { jobs, isLoading, error, hasMore, isLoadingMore, loadMore } = useJobs()
    const { presets } = usePresets()

    const presetNames = useMemo(() => toNamesById(presets), [presets])

    // The whole row opens the analysis. Clicks on its link or its Restart and Delete buttons are left to them, so a row
    // never navigates twice or opens when restarting or deleting.
    const handleRowClick = (event: MouseEvent<HTMLElement>, job: Job) => {
        if ((event.target as HTMLElement).closest('a, button')) {
            return
        }

        router.push(`/analyses/${job.id}`)
    }

    return (
        <section className={styles.page}>
            <h1 className={analysisStyles.pageTitle}>History</h1>
            {error && <Alert type="error" showIcon title={error.message} />}
            <Table<Job>
                rowKey="id"
                columns={getColumns(styles, presetNames, now)}
                tableLayout="fixed"
                rowClassName={() => styles.row}
                onRow={(job) => ({ onClick: (event) => handleRowClick(event, job) })}
                dataSource={jobs}
                loading={isLoading}
                pagination={false}
                locale={{
                    // A failed load says nothing about whether the user has analyses; the alert above explains it.
                    emptyText: error ? null : (
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
