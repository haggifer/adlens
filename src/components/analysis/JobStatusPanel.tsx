'use client'

import { describeJobError } from '@/api/errors'
import { type Job, JobStatus } from 'adlens-shared'
import { Alert, Button, Result, Steps } from 'antd'
import { useRouter } from 'next/navigation'
import { AnalysisAnimation } from './AnalysisAnimation'
import { useStyles } from './styles'

const PROGRESS_STEPS = [
    { status: JobStatus.Verifying, title: 'Checking the video' },
    { status: JobStatus.Queued, title: 'Starting the analysis' },
    { status: JobStatus.Analyzing, title: 'Analyzing the ad' },
]

const getStepItems = (current: number) =>
    PROGRESS_STEPS.map((step, index) => ({
        title: step.title,
        icon: index === current ? <AnalysisAnimation /> : undefined,
    }))

interface IProps {
    job: Job
    // The page can't hear from the API, so the step shown may be stale.
    isDisconnected?: boolean
}

export function JobStatusPanel({ job, isDisconnected = false }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()

    const current = PROGRESS_STEPS.findIndex((step) => step.status === job.status)
    const stepItems = getStepItems(current)
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
                    title="The analysis failed"
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
        <div className={styles.panel}>
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
