'use client'

import { useState } from 'react'
import { DownOutlined, ThunderboltOutlined, UpOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { Alert, App, Button, Input, Select } from 'antd'
import type { AnalysisSettings, Job } from 'adlens-shared'
import { Controller, useForm } from 'react-hook-form'
import useDocClean from '@/hooks/swr-firestore/useDocClean'
import { createJob, startAnalysis } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { useHarness } from '@/design/harness/HarnessContext'
import { uploadJobVideo } from '@/storage/upload'
import ResultsPanel from './ResultsPanel'
import useStyles from './styles'

const PLATFORM_OPTIONS = ['Meta', 'TikTok', 'YouTube'].map((v) => ({ value: v, label: v }))

const OBJECTIVE_OPTIONS = ['Conversion', 'Awareness', 'Consideration'].map((v) => ({ value: v, label: v }))

const FOCUS_OPTIONS = ['Hook', 'Pacing', 'Messaging', 'CTA', 'Branding', 'Audio'].map((v) => ({ value: v, label: v }))

interface AnalysisFormValues {
    platform: string[]
    objective: string
    focus: string[]
    audience: string
    brand: string
}

const DEFAULT_VALUES: AnalysisFormValues = {
    platform: [],
    objective: 'Conversion',
    focus: [],
    audience: '',
    brand: '',
}

interface Quota {
    used: number
    limit: number
}

interface IProps {
    file: File
}

export default function AnalysisSettings({ file }: IProps) {
    const { styles, cx } = useStyles()
    const { message } = App.useApp()
    const { runAccent } = useHarness()
    const { uid, hasFirebaseAuth, openAuth } = useAuth()
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [jobId, setJobId] = useState<string | null>(null)
    const { control, handleSubmit } = useForm<AnalysisFormValues>({ defaultValues: DEFAULT_VALUES })

    const { data: job } = useDocClean<Job>(uid && jobId ? { path: `users/${uid}/jobs/${jobId}` } : null)
    const { data: quota } = useDocClean<Quota>(uid ? { path: `users/${uid}/private/quota` } : null)

    const usedRuns = quota?.used ?? 0
    const runLimit = quota?.limit ?? 3
    const hasQuotaLeft = usedRuns < runLimit

    const run = useMutation({
        mutationFn: async (values: AnalysisFormValues) => {
            const created = await createJob({
                settings: values as AnalysisSettings,
                file: { name: file.name, contentType: file.type, size: file.size },
            })

            if (!created.file) {
                throw new Error('Server did not return an upload target')
            }

            await uploadJobVideo({ path: created.file.path, file })
            await startAnalysis(created.id)
            return created.id
        },
        onSuccess: setJobId,
    })

    const isRunning = run.isPending || (job != null && job.status !== 'analyzed' && job.status !== 'error')

    const onSubmit = (values: AnalysisFormValues) => {
        if (!hasFirebaseAuth) {
            openAuth('signin')
            return
        }

        if (!hasQuotaLeft) {
            message.warning(`You've used all ${runLimit} analyses this week.`)
            return
        }

        run.mutate(values)
    }

    const describeStatus = (): string => {
        if (run.isPending) {
            return 'Uploading and starting analysis…'
        }

        if (job?.status === 'pending' || job?.status === 'queued' || job?.status === 'analyzing') {
            return 'Analyzing…'
        }

        return ''
    }

    if (job?.status === 'analyzed' && job.analysis) {
        return <ResultsPanel analysis={job.analysis} onReset={() => setJobId(null)} />
    }

    return (
        <form className={cx(styles.panel, styles.settingsPanel)} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.panelTitle}>Tell us about your ad</h2>
            <div className={styles.settingsScroll}>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Platform</label>
                    <Controller
                        name="platform"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                mode="multiple"
                                placeholder="Where will it run?"
                                options={PLATFORM_OPTIONS}
                                allowClear
                            />
                        )}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Objective</label>
                    <Controller
                        name="objective"
                        control={control}
                        render={({ field }) => (
                            <Select {...field} placeholder="Campaign goal" options={OBJECTIVE_OPTIONS} allowClear />
                        )}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Analysis focus</label>
                    <Controller
                        name="focus"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                mode="multiple"
                                placeholder="Leave blank to analyze everything"
                                options={FOCUS_OPTIONS}
                                allowClear
                            />
                        )}
                    />
                </div>
                <Button
                    block
                    htmlType="button"
                    className={styles.advancedToggle}
                    icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setAdvancedOpen((open) => !open)}
                >
                    Advanced settings
                </Button>
                {advancedOpen && (
                    <>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Target audience</label>
                            <Controller
                                name="audience"
                                control={control}
                                render={({ field }) => <Input {...field} placeholder="e.g. Gen-Z gamers in the US" />}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Brand context</label>
                            <Controller
                                name="brand"
                                control={control}
                                render={({ field }) => (
                                    <Input.TextArea
                                        {...field}
                                        placeholder="Anything AdLens should know about the brand or product"
                                        rows={3}
                                    />
                                )}
                            />
                        </div>
                    </>
                )}
            </div>
            {quota != null && (
                <p className={styles.hint}>
                    {usedRuns} of {runLimit} analyses used this week
                </p>
            )}
            <Button
                type="primary"
                size="large"
                block
                htmlType="submit"
                className={styles.runButton}
                data-accent={runAccent}
                icon={<ThunderboltOutlined />}
                loading={isRunning}
                disabled={isRunning || !hasQuotaLeft}
            >
                Run Analysis
            </Button>
            {(isRunning || job || run.error) && (
                <div className="d-flex flex-column gap-2">
                    {run.error ? (
                        <Alert type="error" showIcon message={run.error.message} />
                    ) : job?.status === 'error' ? (
                        <Alert type="error" showIcon message={job.error ?? 'Something went wrong'} />
                    ) : (
                        <p className={styles.hint}>{describeStatus()}</p>
                    )}
                </div>
            )}
        </form>
    )
}
