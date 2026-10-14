'use client'

import { AnalysisWorkspace } from '@/components/analysis/AnalysisWorkspace'
import { formatSeconds } from '@/components/analysis/results'
import { useStyles as useAnalysisStyles } from '@/components/analysis/styles'
import { ErrorState } from '@/components/status/ErrorState'
import { useDemos } from '@/hooks/useDemos'
import { formatMarkets, formatPlatforms } from '@/labels'
import type { Demo } from 'adlens-shared'
import { Empty, Segmented, Spin } from 'antd'
import { useState } from 'react'
import { useStyles } from './styles'

// What the demo's report was run against, as the analysis page shows a user's own settings.
const describeDemoRun = ({ job }: Demo): string => {
    const length = job.media ? `${formatSeconds(job.media.durationS)} video` : 'Video'

    return `${length} · checked for ${formatPlatforms(job.settings.platforms)} in ${formatMarkets(job.settings.markets ?? [])}`
}

// Finished example reports, one per tab, for visitors who haven't run an analysis yet.
export function DemoView() {
    const { styles } = useStyles()
    const { styles: analysisStyles } = useAnalysisStyles()

    const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

    const { demos, isLoading, error, isRetrying, retry } = useDemos()

    const demo = demos.find(({ slug }) => slug === selectedSlug) ?? demos[0]
    const tabs = demos.map(({ slug, label }) => ({ value: slug, label }))

    // The page's second row: the report, or what stands in its place.
    const renderBody = () => {
        if (isLoading) {
            return <Spin size="large" className="m-auto" />
        }

        // A failed refetch keeps the reports already on screen.
        if (error && !demos.length) {
            return <ErrorState title={error.message} onRetry={retry} isRetrying={isRetrying} />
        }

        if (!demo) {
            return <Empty className="m-auto" description="No example reports yet." />
        }

        // A key per demo, so the player starts over with each one.
        return <AnalysisWorkspace key={demo.id} job={demo.job} videoUrl={demo.videoUrl} hasPlayer />
    }

    return (
        <div className={analysisStyles.page}>
            <div className={analysisStyles.intro}>
                <header className="d-flex flex-column gap-1">
                    <h1 className={analysisStyles.pageTitle}>Example reports</h1>
                    <p className={analysisStyles.pageMeta}>Real ads, analyzed by AdLens. Pick one to see its report.</p>
                </header>
                {demo && tabs.length > 1 && (
                    <Segmented className={styles.tabs} options={tabs} value={demo.slug} onChange={setSelectedSlug} />
                )}
                {demo && (
                    <section className={styles.summary}>
                        <h2 className={styles.summaryTitle}>{demo.title}</h2>
                        <p className={styles.summaryText}>{demo.subtitle}</p>
                        <p className={analysisStyles.pageMeta}>{describeDemoRun(demo)}</p>
                    </section>
                )}
            </div>
            {renderBody()}
        </div>
    )
}
