'use client'

import { AnalysisWorkspace } from '@/components/analysis/AnalysisWorkspace'
import { formatSeconds } from '@/components/analysis/results'
import { useStyles as useAnalysisStyles } from '@/components/analysis/styles'
import { useDemos } from '@/hooks/useDemos'
import { formatPlatforms, MARKET_LABELS } from '@/labels'
import type { Demo, Market } from 'adlens-shared'
import { Alert, Button, Empty, Segmented, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useStyles } from './styles'

const ALL_MARKETS_LABEL = 'all markets'

const formatMarkets = (markets: Market[]): string =>
    markets.length ? markets.map((market) => MARKET_LABELS[market]).join(', ') : ALL_MARKETS_LABEL

// What the demo's report was run against, as the analysis page shows a user's own settings.
const describeDemoRun = ({ job }: Demo): string => {
    const length = job.media ? `${formatSeconds(job.media.durationS)} video` : 'Video'

    return `${length} · checked for ${formatPlatforms(job.settings.platforms)} in ${formatMarkets(job.settings.markets ?? [])}`
}

// Finished example reports, one per tab, for visitors who haven't run an analysis yet.
export function DemoView() {
    const { styles } = useStyles()
    const { styles: analysisStyles } = useAnalysisStyles()
    const router = useRouter()

    const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

    const { demos, isLoading, error } = useDemos()

    const demo = demos.find(({ slug }) => slug === selectedSlug) ?? demos[0]
    const tabs = demos.map(({ slug, label }) => ({ value: slug, label }))

    const renderDemo = () => {
        if (isLoading) {
            return <Spin size="large" className="m-auto" />
        }

        if (error) {
            return <Alert type="error" showIcon title={error.message} />
        }

        if (!demo) {
            return <Empty description="No example reports yet." />
        }

        return (
            <>
                {tabs.length > 1 && <Segmented options={tabs} value={demo.slug} onChange={setSelectedSlug} />}
                <section className={styles.summary}>
                    <h2 className={styles.summaryTitle}>{demo.title}</h2>
                    <p className={styles.summaryText}>{demo.subtitle}</p>
                    <p className={analysisStyles.pageMeta}>{describeDemoRun(demo)}</p>
                </section>
                {/* A key per demo, so the player starts over with each one. */}
                <AnalysisWorkspace key={demo.id} job={demo.job} videoUrl={demo.videoUrl} hasPlayer />
            </>
        )
    }

    return (
        <div className={analysisStyles.page}>
            <header className={styles.header}>
                <div className="d-flex flex-column gap-1">
                    <h1 className={analysisStyles.pageTitle}>Example reports</h1>
                    <p className={analysisStyles.pageMeta}>Real ads, analyzed by AdLens. Pick one to see its report.</p>
                </div>
                <Button type="primary" onClick={() => router.push('/')}>
                    Analyze your ad
                </Button>
            </header>
            {renderDemo()}
        </div>
    )
}
