'use client'

import { describeRequestError } from '@/api/errors'
import { ErrorState } from '@/components/status/ErrorState'
import { useAdmission } from '@/hooks/useAdmission'
import { RequestErrorCode, type Sample } from 'adlens-shared'
import { Spin } from 'antd'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { SamplesModal } from './SamplesModal'
import { useStyles } from './styles'
import type { AcceptedVideo, AnalysisSource, SelectedVideo } from './types'
import { UploadIntro } from './UploadIntro'
import { UploadPanel } from './UploadPanel'

// The empty panel, so the column keeps its box while the form loads.
const SettingsPlaceholder = () => {
    const { styles, cx } = useStyles()

    return (
        <div className={cx(styles.panel, styles.settingsPanel, 'align-items-center justify-content-center')}>
            <Spin />
        </div>
    )
}

// The settings panel shows only once a video is chosen, so its form, selects and human check load then, off the page's
// first load.
const AnalysisSettings = dynamic(() => import('./AnalysisSettings').then((module) => module.AnalysisSettings), {
    loading: SettingsPlaceholder,
})

// Whatever stopped the API answering, the visitor can't start an analysis until it's back.
const UNAVAILABLE_COPY = describeRequestError(RequestErrorCode.Unavailable)

const releasePreview = (source: AnalysisSource | null) => {
    if (source?.kind === 'file') {
        URL.revokeObjectURL(source.url)
    }
}

const toSelectedVideo = (source: AnalysisSource | null): SelectedVideo | null => {
    if (!source) {
        return null
    }

    if (source.kind === 'sample') {
        const { previewUrl, contentType, title, media } = source.sample

        return { url: previewUrl, type: contentType, sampleTitle: title, width: media.width, height: media.height }
    }

    return { url: source.url, type: source.contentType, width: source.width, height: source.height }
}

export function AdWorkspace() {
    const { styles } = useStyles()

    const [source, setSource] = useState<AnalysisSource | null>(null)
    const [isSamplesOpen, setIsSamplesOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)

    // Asked on load, not only once a video is chosen: an API that can't answer can't run an analysis, so the page says
    // so before anyone uploads or picks settings. A run already under way keeps its page.
    const admission = useAdmission()

    const video = toSelectedVideo(source)
    const isUnavailable = admission.isUnavailable && !isRunning

    const handleSelectFile = (file: File, { contentType, width, height }: AcceptedVideo) => {
        releasePreview(source)
        setSource({ kind: 'file', file, contentType, url: URL.createObjectURL(file), width, height })
    }

    const handleSelectSample = (sample: Sample) => {
        releasePreview(source)
        setSource({ kind: 'sample', sample })
        setIsSamplesOpen(false)
    }

    const handleClearVideo = () => {
        releasePreview(source)
        setSource(null)
    }

    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <h1 className={styles.heroTitle}>
                    Find out <span className={styles.heroAccent}>why</span> your video ads{' '}
                    <span className={styles.heroAccent}>underperform</span>
                </h1>
                <p className={styles.heroSubtitle}>
                    Upload a video ad and AdLens checks it against platform ad policies and creative best practices —
                    every finding timestamped and cited
                </p>
            </header>
            {isUnavailable ? (
                <ErrorState title={UNAVAILABLE_COPY} onRetry={admission.retry} isRetrying={admission.isRetrying} />
            ) : (
                <div className={styles.workspace}>
                    <div className={styles.left}>
                        <UploadPanel
                            video={video}
                            onSelect={handleSelectFile}
                            onClear={handleClearVideo}
                            onBrowseSamples={() => setIsSamplesOpen(true)}
                            isDisabled={isRunning}
                        />
                    </div>
                    <div className={styles.right}>
                        {source ? (
                            // A key per source, so no run error carries over to the next video; the settings do, through
                            // the address.
                            <AnalysisSettings
                                key={source.kind === 'sample' ? `sample-${source.sample.id}` : source.url}
                                source={source}
                                onRunningChange={setIsRunning}
                            />
                        ) : (
                            <UploadIntro />
                        )}
                    </div>
                </div>
            )}
            <SamplesModal
                isOpen={isSamplesOpen}
                onClose={() => setIsSamplesOpen(false)}
                onSelect={handleSelectSample}
            />
        </div>
    )
}
