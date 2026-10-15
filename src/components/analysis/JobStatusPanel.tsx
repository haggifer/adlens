'use client'

import { describeJobError, describeJobErrorTitle } from '@/api/errors'
import { type Job, JobStatus } from 'adlens-shared'
import { Alert, Button, Result, Steps } from 'antd'
import { useTheme } from 'antd-style'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { AnalysisAnimation } from './AnalysisAnimation'
import { useStyles } from './styles'

const PROGRESS_STEPS = [
    { status: JobStatus.Verifying, title: 'Checking the video' },
    { status: JobStatus.Queued, title: 'Starting the analysis' },
    { status: JobStatus.Analyzing, title: 'Analyzing the ad' },
]

// antd fills a finished step's circle with colorPrimaryBg, a grey-teal for this primary that the check barely stands
// out from; a solid teal circle with a white check reads as done in both themes. Inline, so it beats antd's own rules.
const getStepItems = (current: number, finishedIconStyle: CSSProperties) =>
    PROGRESS_STEPS.map((step, index) => ({
        title: step.title,
        icon: index === current ? <AnalysisAnimation /> : undefined,
        styles: index < current ? { icon: finishedIconStyle } : undefined,
    }))

interface IProps {
    job: Job
    // The page can't hear from the API, so the step shown may be stale.
    isDisconnected?: boolean
}

export function JobStatusPanel({ job, isDisconnected = false }: IProps) {
    const { styles, cx } = useStyles()
    const token = useTheme()
    const router = useRouter()

    const current = PROGRESS_STEPS.findIndex((step) => step.status === job.status)
    const finishedIconStyle = { background: token.colorPrimary, color: token.colorTextLightSolid }
    const stepItems = getStepItems(current, finishedIconStyle)
    const newAnalysisButton = (
        <Button type="primary" onClick={() => router.push('/')}>
            Start a new analysis
        </Button>
    )

    if (job.status === JobStatus.Error) {
        return (
            <div className={styles.panel}>
                <Result
                    status="error"
                    title={describeJobErrorTitle(job.errorCode)}
                    subTitle={describeJobError(job.errorCode)}
                    extra={
                        <Button type="primary" onClick={() => router.push('/')}>
                            Analyze another video
                        </Button>
                    }
                />
            </div>
        )
    }

    // A job stays pending when its upload never finished; nothing was charged for it.
    if (job.status === JobStatus.Pending) {
        return (
            <div className={styles.panel}>
                <Result
                    status="warning"
                    title="This analysis never started"
                    subTitle="The upload didn’t finish, so it wasn’t counted against your analyses."
                    extra={newAnalysisButton}
                />
            </div>
        )
    }

    return (
        <div className={cx(styles.panel, styles.progressPanel)}>
            <h2 className={styles.panelTitle}>Analyzing your ad</h2>
            <p className={styles.hint}>This usually takes under a minute. You can leave this page and come back.</p>
            {isDisconnected && (
                <Alert
                    type="warning"
                    showIcon
                    title="Can’t reach AdLens right now. This page updates once it’s back."
                />
            )}
            <Steps orientation="vertical" size="small" current={current} items={stepItems} />
        </div>
    )
}
