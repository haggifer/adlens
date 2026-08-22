'use client'

import { useEffect, useRef, useState } from 'react'
import AnalysisSettings from './AnalysisSettings'
import UploadIntro from './UploadIntro'
import UploadPanel, { SelectedVideo } from './UploadPanel'
import useStyles from './styles'

export default function AdWorkspace() {
    const { styles } = useStyles()
    const [video, setVideo] = useState<SelectedVideo | null>(null)
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

    const selectFile = (file: File) => {
        setVideo((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev.url)
            }

            return { url: URL.createObjectURL(file), type: file.type }
        })
    }

    const clearVideo = () => {
        setVideo((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev.url)
            }

            return null
        })
    }

    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <h1 className={styles.heroTitle}>
                    Find out <span className={styles.heroAccent}>why</span> your video ads{' '}
                    <span className={styles.heroAccent}>underperform</span>
                </h1>
                <p className={styles.heroSubtitle}>
                    Upload a video ad and AdLens diagnoses what’s holding it back — no guesswork
                </p>
            </header>
            <div className={styles.workspace} ref={workspaceRef}>
                <div className={styles.left}>
                    <UploadPanel video={video} onSelect={selectFile} onClear={clearVideo} />
                </div>
                <div className={styles.right}>{video ? <AnalysisSettings /> : <UploadIntro />}</div>
            </div>
        </div>
    )
}
