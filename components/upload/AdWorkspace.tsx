'use client'

import { useState } from 'react'
import AnalysisSettings from './AnalysisSettings'
import UploadIntro from './UploadIntro'
import UploadPanel from './UploadPanel'
import useStyles from './styles'

export default function AdWorkspace() {
    const { styles } = useStyles()
    const [videoUrl, setVideoUrl] = useState<string | null>(null)

    const selectFile = (file: File) => {
        setVideoUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev)
            }

            return URL.createObjectURL(file)
        })
    }

    const clearVideo = () => {
        setVideoUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev)
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
                    Upload a video ad and AdLens diagnoses what’s holding it back — no guesswork.
                </p>
            </header>
            <div className={styles.workspace}>
                <UploadPanel videoUrl={videoUrl} onSelect={selectFile} onClear={clearVideo} />
                <div className={styles.right}>{videoUrl ? <AnalysisSettings /> : <UploadIntro />}</div>
            </div>
        </div>
    )
}
