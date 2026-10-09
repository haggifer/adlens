'use client'

import { BackButton } from '@/components/utils/BackButton'
import { useJob } from '@/hooks/useJob'
import { useJobVideo } from '@/hooks/useJobVideo'
import { formatPlatforms } from '@/labels'
import { JobStatus, RequestErrorCode } from 'adlens-shared'
import { Button, Result, Spin, Tag } from 'antd'
import { useRouter } from 'next/navigation'
import { AnalysisWorkspace } from './AnalysisWorkspace'
import { DeleteJobButton } from './DeleteJobButton'
import { useStyles } from './styles'

interface IProps {
    jobId: string
}

export function AnalysisView({ jobId }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()

    const { job, isLoading, error, isDisconnected } = useJob(jobId)
    // Only a verified upload has a video to replay (`media`), so a pending job or one still being checked has none. A
    // failed job's video backs no results and is deleted soon after the failure, so its page never shows a player.
    const hasVideo = Boolean(job?.media) && job?.status !== JobStatus.Error
    const { url, isMissing } = useJobVideo(jobId, hasVideo)

    const platforms = job ? formatPlatforms(job.settings.platforms) : ''

    if (isLoading) {
        return (
            <div className={styles.statusPage}>
                <Spin size="large" />
            </div>
        )
    }

    // A failed re-read keeps the job on screen; useJob reports it as a lost connection.
    if (!job) {
        const isNotFound = error?.code === RequestErrorCode.NotFound

        return (
            <div className={styles.statusPage}>
                <Result
                    status={isNotFound ? '404' : 'error'}
                    title={isNotFound ? 'Analysis not found' : 'Couldn’t load this analysis'}
                    subTitle={error?.message}
                    extra={
                        <Button type="primary" onClick={() => router.push('/history')}>
                            Go to history
                        </Button>
                    }
                />
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <div className={styles.intro}>
                <div>
                    <BackButton fallbackHref="/history" />
                </div>
                <header className={styles.pageHeader}>
                    <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center gap-2">
                            <h1 className={styles.pageTitle}>{job.file.name}</h1>
                            {job.sampleId && <Tag color="processing">Sample ad</Tag>}
                        </div>
                        <p className={styles.pageMeta}>
                            {platforms} · {new Date(job.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <DeleteJobButton job={job} onDeleted={() => router.replace('/history')} />
                </header>
            </div>
            <AnalysisWorkspace
                job={job}
                videoUrl={url}
                hasPlayer={hasVideo && !isMissing}
                isDisconnected={isDisconnected}
            />
        </div>
    )
}
