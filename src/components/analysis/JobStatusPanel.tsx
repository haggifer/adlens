'use client'

import { type Job, JobStatus } from 'adlens-shared'
import { Button, Result, Spin, Steps } from 'antd'
import { useRouter } from 'next/navigation'
import { describeJobError } from '@/api/errors'
import { useStyles } from './styles'

const PROGRESS_STEPS = [
    { status: JobStatus.Verifying, title: 'Checking the video' },
    { status: JobStatus.Queued, title: 'Waiting for a worker' },
    { status: JobStatus.Analyzing, title: 'Analyzing the ad' },
]

interface IProps {
    job: Job
}

export function JobStatusPanel({ job }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()

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
                    extra={newAnalysisButton}
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

    const current = PROGRESS_STEPS.findIndex((step) => step.status === job.status)

    return (
        <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Analyzing your ad</h2>
            <p className={styles.hint}>This usually takes under a minute. You can leave this page and come back.</p>
            <Steps
                orientation="vertical"
                size="small"
                current={current}
                items={PROGRESS_STEPS.map((step, index) => ({
                    title: step.title,
                    icon: index === current ? <Spin size="small" /> : undefined,
                }))}
            />
        </div>
    )
}
