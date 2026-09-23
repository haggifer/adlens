'use client'

import { type MediaPlayerInstance, MediaPlayer, MediaProvider } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import { JobStatus, RequestErrorCode } from 'adlens-shared'
import { Button, Result, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { toVidstackType } from '@/components/utils/vidstack'
import useJob from '@/hooks/useJob'
import useJobVideo from '@/hooks/useJobVideo'
import { PLATFORM_LABELS } from '@/labels'
import JobStatusPanel from './JobStatusPanel'
import ResultsPanel from './ResultsPanel'
import { useStyles } from './styles'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

interface IProps {
    jobId: string
}

export default function AnalysisView({ jobId }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const { job, isLoading, error } = useJob(jobId)
    // A pending job never received its upload, so there is nothing to replay.
    const { url } = useJobVideo(jobId, Boolean(job) && job?.status !== JobStatus.Pending)
    // Vidstack is imperative for seeking; the ref is the player instance, not DOM state.
    const playerRef = useRef<MediaPlayerInstance>(null)

    const contentType = job?.file.contentType

    const playerSrc = useMemo(
        () => (url && contentType ? { src: url, type: toVidstackType(contentType) } : undefined),
        [url, contentType],
    )

    const handleSeek = (seconds: number) => {
        const player = playerRef.current

        if (!player) {
            return
        }

        player.currentTime = seconds
        void player.play()
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
            <header className={styles.pageHeader}>
                <div className="d-flex flex-column gap-1">
                    <h1 className={styles.pageTitle}>{job.file.name}</h1>
                    <p className={styles.pageMeta}>
                        {platforms || 'General rules'} · {new Date(job.createdAt).toLocaleString()}
                    </p>
                </div>
                <Button onClick={() => router.push('/')}>New analysis</Button>
            </header>
            <div className={styles.workspace}>
                <div className={styles.stage}>
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
                                slots={{ googleCastButton: null, airPlayButton: null }}
                            />
                        </MediaPlayer>
                    ) : (
                        job.status !== JobStatus.Pending && <Spin />
                    )}
                </div>
                {job.status === JobStatus.Analyzed && job.analysis ? (
                    <ResultsPanel analysis={job.analysis} onSeek={handleSeek} />
                ) : (
                    <JobStatusPanel job={job} />
                )}
            </div>
        </div>
    )
}
