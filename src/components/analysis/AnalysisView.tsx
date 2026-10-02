'use client'

import { BackButton } from '@/components/utils/BackButton'
import { NO_CAST_SLOTS, toMediaRatioStyle, toVidstackType } from '@/components/utils/vidstack'
import { useJob } from '@/hooks/useJob'
import { useJobVideo } from '@/hooks/useJobVideo'
import { ALL_PLATFORMS_LABEL, PLATFORM_LABELS } from '@/labels'
import { MediaPlayer, type MediaPlayerInstance, MediaProvider } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { JobStatus, RequestErrorCode } from 'adlens-shared'
import { Button, Result, Spin, Tag } from 'antd'
import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { DeleteJobButton } from './DeleteJobButton'
import { JobStatusPanel } from './JobStatusPanel'
import { ResultsPanel } from './ResultsPanel'
import { useStyles } from './styles'

interface IProps {
    jobId: string
}

const toPlayerSrc = (url: string | undefined, contentType: string | undefined) =>
    url && contentType ? { src: url, type: toVidstackType(contentType) } : undefined

export function AnalysisView({ jobId }: IProps) {
    const { styles, cx } = useStyles()
    const router = useRouter()

    // Vidstack is imperative for seeking; the ref is the player instance, not DOM state.
    const playerRef = useRef<MediaPlayerInstance>(null)

    const { job, isLoading, error } = useJob(jobId)
    // Only a verified upload has a video to replay (`media`), so a pending job or one still being checked has none. A
    // failed job's video backs no results and is deleted soon after the failure, so its page never shows a player.
    const hasVideo = Boolean(job?.media) && job?.status !== JobStatus.Error
    const { url, isMissing } = useJobVideo(jobId, hasVideo)

    const hasPlayer = hasVideo && !isMissing
    const contentType = job?.file.contentType
    const playerSrc = useMemo(() => toPlayerSrc(url, contentType), [url, contentType])

    const handleSeek = (seconds: number) => {
        const player = playerRef.current

        if (!player) {
            return
        }

        player.currentTime = seconds
        void player.play()

        // When the layout is stacked (phones, tablets) the findings sit below the video, often scrolled past it.
        const stage = player.el?.parentElement
        const rect = stage?.getBoundingClientRect()

        if (stage && rect && (rect.bottom < 0 || rect.top > window.innerHeight)) {
            stage.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    if (isLoading) {
        return (
            <div className={styles.page}>
                <Spin size="large" className="m-auto" />
            </div>
        )
    }

    if (error || !job) {
        const isMissing = error?.code === RequestErrorCode.NotFound

        return (
            <div className={styles.page}>
                <Result
                    status={isMissing ? '404' : 'error'}
                    title={isMissing ? 'Analysis not found' : 'Couldn’t load this analysis'}
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

    const platforms = job.settings.platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ')

    return (
        <div className={styles.page}>
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
                        {platforms || ALL_PLATFORMS_LABEL} · {new Date(job.createdAt).toLocaleString()}
                    </p>
                </div>
                <DeleteJobButton job={job} onDeleted={() => router.replace('/history')} />
            </header>
            <div className={cx(styles.workspace, !hasPlayer && 'justify-content-center align-items-start')}>
                {hasPlayer && (
                    <div className={styles.stage} style={toMediaRatioStyle(job.media?.width, job.media?.height)}>
                        {playerSrc ? (
                            <MediaPlayer
                                ref={playerRef}
                                className={styles.player}
                                src={playerSrc}
                                viewType="video"
                                playsInline
                                aria-label={`Video ad ${job.file.name}`}
                            >
                                <MediaProvider />
                                <DefaultVideoLayout
                                    icons={defaultLayoutIcons}
                                    smallLayoutWhen={false}
                                    slots={NO_CAST_SLOTS}
                                />
                            </MediaPlayer>
                        ) : (
                            <Spin />
                        )}
                    </div>
                )}
                {job.status === JobStatus.Analyzed && job.analysis ? (
                    <ResultsPanel analysis={job.analysis} onSeek={handleSeek} />
                ) : (
                    <JobStatusPanel job={job} />
                )}
            </div>
        </div>
    )
}
