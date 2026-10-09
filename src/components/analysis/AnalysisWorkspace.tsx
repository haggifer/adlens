'use client'

import { LazyVideoPlayer } from '@/components/player/LazyVideoPlayer'
import { toMediaRatioStyle } from '@/components/utils/vidstack'
import type { MediaPlayerInstance } from '@vidstack/react'
import { type Job, JobStatus } from 'adlens-shared'
import { Spin } from 'antd'
import { useRef } from 'react'
import { JobStatusPanel } from './JobStatusPanel'
import { ResultsPanel } from './ResultsPanel'
import { useStyles } from './styles'

interface IProps {
    job: Job
    // The video's address once known; undefined while it loads.
    videoUrl?: string
    // False when the job has no video to show: then the results take the whole width.
    hasPlayer: boolean
    // The live connection to a running job is lost (see useJob).
    isDisconnected?: boolean
}

// The video beside its results (or the run's status): one analysis, wherever it's shown.
export function AnalysisWorkspace({ job, videoUrl, hasPlayer, isDisconnected }: IProps) {
    const { styles, cx } = useStyles()

    // Vidstack is imperative for seeking; the ref is the player instance, not DOM state.
    const playerRef = useRef<MediaPlayerInstance>(null)

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

    return (
        <div
            className={cx(
                styles.workspace,
                hasPlayer ? styles.workspaceWithStage : 'justify-content-center align-items-start',
            )}
        >
            {hasPlayer && (
                <div className={styles.stage} style={toMediaRatioStyle(job.media?.width, job.media?.height)}>
                    {videoUrl ? (
                        <LazyVideoPlayer
                            playerRef={playerRef}
                            className={styles.player}
                            url={videoUrl}
                            contentType={job.file.contentType}
                            ariaLabel={`Video ad ${job.file.name}`}
                        />
                    ) : (
                        <Spin />
                    )}
                </div>
            )}
            {job.status === JobStatus.Analyzed && job.analysis ? (
                <ResultsPanel analysis={job.analysis} onSeek={handleSeek} />
            ) : (
                <JobStatusPanel job={job} isDisconnected={isDisconnected} />
            )}
        </div>
    )
}
