'use client'

import { describeRequestError } from '@/api/errors'
import { ErrorState } from '@/components/status/ErrorState'
import { useAdmission } from '@/hooks/useAdmission'
import { type AnalysisSettingsInput, RequestErrorCode, type Sample } from 'adlens-shared'
import { Spin } from 'antd'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { SamplesModal } from './SamplesModal'
import { SettingsPlaceholder } from './SettingsPlaceholder'
import { useStyles } from './styles'
import type { AcceptedVideo, AnalysisSource, SelectedVideo } from './types'
import { UploadIntro } from './UploadIntro'
import { UploadPanel } from './UploadPanel'

// The settings panel shows only once a video is chosen, so its form, selects and human check load then, off the page's
// first load.
const AnalysisSettings = dynamic(() => import('./AnalysisSettings').then((module) => module.AnalysisSettings), {
    loading: SettingsPlaceholder,
})

const NO_SETTINGS: AnalysisSettingsInput = { platforms: [], placements: [], markets: [] }

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
    // The source a pick finishing later must release: a handler from an earlier render would see a stale one.
    const sourceRef = useRef<AnalysisSource | null>(null)
    const [isSamplesOpen, setIsSamplesOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [isReadingVideo, setIsReadingVideo] = useState(false)
    const [settings, setSettings] = useState<AnalysisSettingsInput>(NO_SETTINGS)
    const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null)

    // Asked on load, not only once a video is chosen: an API that can't answer can't run an analysis, so the page says
    // so before anyone uploads or picks settings. A run already under way keeps its page.
    const admission = useAdmission()

    const video = toSelectedVideo(source)
    const isUnavailable = admission.isUnavailable && !isRunning
    // Neither the upload, which would vanish again if the retries fail too, nor the notice, which they may lift.
    const isRecovering = admission.isRecovering && !isRunning

    // The preview URL is what keeps the in-memory copy of a picked video alive, so each replaced one is released.
    const replaceSource = (next: AnalysisSource | null) => {
        releasePreview(sourceRef.current)
        sourceRef.current = next
        setSource(next)
    }

    const handleSelectFile = (file: File, { contentType, width, height }: AcceptedVideo) =>
        replaceSource({ kind: 'file', file, contentType, url: URL.createObjectURL(file), width, height })

    const handleSelectSample = (sample: Sample) => {
        replaceSource({ kind: 'sample', sample })
        setIsSamplesOpen(false)
    }

    const handleClearVideo = () => replaceSource(null)

    const renderWorkspace = () => {
        if (isUnavailable) {
            return <ErrorState title={UNAVAILABLE_COPY} onRetry={admission.retry} isRetrying={admission.isRetrying} />
        }

        if (isRecovering) {
            return <Spin size="large" className="m-auto" />
        }

        return (
            <div className={styles.workspace}>
                <div className={styles.left}>
                    <UploadPanel
                        video={video}
                        onSelect={handleSelectFile}
                        onClear={handleClearVideo}
                        onBrowseSamples={() => setIsSamplesOpen(true)}
                        isDisabled={isRunning}
                        isReading={isReadingVideo}
                        onReadingChange={setIsReadingVideo}
                    />
                </div>
                <div className={styles.right}>
                    {source ? (
                        // A key per source, so no run error carries over to the next video; the settings and the
                        // preset applied to them do, held here.
                        <AnalysisSettings
                            key={source.kind === 'sample' ? `sample-${source.sample.id}` : source.url}
                            source={source}
                            settings={settings}
                            onSettingsChange={setSettings}
                            appliedPresetId={appliedPresetId}
                            onAppliedPresetChange={setAppliedPresetId}
                            onRunningChange={setIsRunning}
                            isVideoReading={isReadingVideo}
                        />
                    ) : (
                        <UploadIntro />
                    )}
                </div>
            </div>
        )
    }

    // A run leaves for its analysis with a client-side navigation, so without this the copy (up to the upload limit)
    // would stay in memory until the tab reloads.
    useEffect(() => () => releasePreview(sourceRef.current), [])

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
            {renderWorkspace()}
            <SamplesModal
                isOpen={isSamplesOpen}
                onClose={() => setIsSamplesOpen(false)}
                onSelect={handleSelectSample}
            />
        </div>
    )
}
