'use client'

import type { Sample } from 'adlens-shared'
import { useEffect, useRef, useState } from 'react'
import AnalysisSettings from './AnalysisSettings'
import SamplesModal from './SamplesModal'
import { useStyles } from './styles'
import type { AnalysisSource } from './types'
import UploadIntro from './UploadIntro'
import UploadPanel, { type VideoMetadata } from './UploadPanel'

const releasePreview = (source: AnalysisSource | null) => {
    if (source?.kind === 'file') {
        URL.revokeObjectURL(source.url)
    }
}

export default function AdWorkspace() {
    const { styles } = useStyles()
    const [source, setSource] = useState<AnalysisSource | null>(null)
    const [isSamplesOpen, setIsSamplesOpen] = useState(false)
    const workspaceRef = useRef<HTMLDivElement>(null)

    // The square and panel size off the flex column height directly (100%). A hugged (fit-content) video
    // can't: CSS can't hand a % height to a fit-content parent's child. So mirror the column's flex-computed
    // height into --stage-h (a real px length) for the video's max-height to scale against.
    useEffect(() => {
        const el = workspaceRef.current

        if (!el) {
            return
        }

        const sync = () => el.style.setProperty('--stage-h', `${el.clientHeight}px`)
        sync()

        const observer = new ResizeObserver(sync)
        observer.observe(el)

        return () => observer.disconnect()
    }, [])

    const selectFile = (file: File, { width, height }: VideoMetadata) => {
        releasePreview(source)
        setSource({ kind: 'file', file, url: URL.createObjectURL(file), width, height })
    }

    const selectSample = (sample: Sample) => {
        releasePreview(source)
        setSource({ kind: 'sample', sample })
        setIsSamplesOpen(false)
    }

    const clearVideo = () => {
        releasePreview(source)
        setSource(null)
    }

    const getVideo = () => {
        if (!source) {
            return null
        }

        if (source.kind === 'sample') {
            const { previewUrl, contentType, title, media } = source.sample

            return { url: previewUrl, type: contentType, sampleTitle: title, width: media.width, height: media.height }
        }

        return { url: source.url, type: source.file.type, width: source.width, height: source.height }
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
            <div className={styles.workspace} ref={workspaceRef}>
                <div className={styles.left}>
                    <UploadPanel
                        video={getVideo()}
                        onSelect={selectFile}
                        onClear={clearVideo}
                        onBrowseSamples={() => setIsSamplesOpen(true)}
                    />
                </div>
                <div className={styles.right}>
                    {source ? (
                        <AnalysisSettings
                            key={source.kind === 'sample' ? `sample-${source.sample.id}` : 'upload'}
                            source={source}
                        />
                    ) : (
                        <UploadIntro />
                    )}
                </div>
            </div>
            <SamplesModal isOpen={isSamplesOpen} onClose={() => setIsSamplesOpen(false)} onSelect={selectSample} />
        </div>
    )
}
