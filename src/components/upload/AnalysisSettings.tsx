'use client'

import { ThunderboltOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    type AnalysisSettings as AnalysisSettingsValues,
    type AnalysisSettingsInput,
    analysisSettingsSchema,
    Market,
    Placement,
    PLACEMENT_PLATFORM,
    Platform,
    QUOTA_WINDOW_MS,
    type VideoMimeType,
} from 'adlens-shared'
import { Alert, Button, Progress, Select } from 'antd'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toApiRequestError } from '@/api/errors'
import { createJob, createSampleJob, startAnalysis } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import useQuota, { quotaKey } from '@/hooks/useQuota'
import { MARKET_LABELS, PLACEMENT_LABELS, PLATFORM_LABELS } from '@/labels'
import { uploadToSignedUrl } from '@/storage/upload'
import { useStyles } from './styles'
import type { AnalysisSource } from './types'

const PLATFORM_OPTIONS = Object.values(Platform).map((value) => ({ value, label: PLATFORM_LABELS[value] }))

const MARKET_OPTIONS = Object.values(Market).map((value) => ({ value, label: MARKET_LABELS[value] }))

const DEFAULT_VALUES: AnalysisSettingsInput = {
    platforms: [],
    placements: [],
    markets: [],
}

const getDefaultValues = (source: AnalysisSource): AnalysisSettingsInput =>
    source.kind === 'sample' ? { ...DEFAULT_VALUES, ...source.sample.settings } : DEFAULT_VALUES

const getPlacementOptions = (platforms: Platform[]) =>
    platforms.map((platform) => ({
        label: PLATFORM_LABELS[platform],
        options: Object.values(Placement)
            .filter((placement) => PLACEMENT_PLATFORM[placement] === platform)
            .map((value) => ({ value, label: `${platform} · ${PLACEMENT_LABELS[value]}` })),
    }))

const formatResetDate = (windowStart: string) =>
    new Date(new Date(windowStart).getTime() + QUOTA_WINDOW_MS).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })

enum RunStage {
    Idle = 'idle',
    Creating = 'creating',
    Uploading = 'uploading',
    Starting = 'starting',
}

interface IProps {
    source: AnalysisSource
}

export default function AnalysisSettings({ source }: IProps) {
    const { styles, cx } = useStyles()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { isSignedIn, user } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const { quota } = useQuota()
    const [stage, setStage] = useState<RunStage>(RunStage.Idle)
    const [uploadProgress, setUploadProgress] = useState(0)
    const { control, handleSubmit, getValues, setValue } = useForm<
        AnalysisSettingsInput,
        unknown,
        AnalysisSettingsValues
    >({
        resolver: zodResolver(analysisSettingsSchema),
        defaultValues: getDefaultValues(source),
    })

    const platforms = useWatch({ control, name: 'platforms' }) ?? []
    // A null limit is an unlimited (admin) account.
    const hasQuotaLeft = !quota || quota.limit === null || quota.used < quota.limit

    const run = useMutation({
        mutationFn: async (settings: AnalysisSettingsValues) => {
            setStage(RunStage.Creating)
            setUploadProgress(0)

            if (source.kind === 'sample') {
                const job = await createSampleJob({ sampleId: source.sample.id, settings })

                setStage(RunStage.Starting)
                await startAnalysis(job.id)

                return job.id
            }

            const { file } = source
            const { job, upload } = await createJob({
                settings,
                file: { name: file.name, contentType: file.type as VideoMimeType, size: file.size },
            })

            setStage(RunStage.Uploading)
            await uploadToSignedUrl({ target: upload, file, onProgress: setUploadProgress })
            setStage(RunStage.Starting)
            await startAnalysis(job.id)

            return job.id
        },
        onSuccess: (jobId) => {
            void queryClient.invalidateQueries({ queryKey: quotaKey(user?.id) })
            void queryClient.invalidateQueries({ queryKey: ['jobs', user?.id] })
            router.push(`/analyses/${jobId}`)
        },
        onError: () => setStage(RunStage.Idle),
    })

    const handlePlatformsChange = (next: Platform[]) => {
        setValue('platforms', next)
        setValue(
            'placements',
            (getValues('placements') ?? []).filter((placement) => next.includes(PLACEMENT_PLATFORM[placement])),
        )
    }

    const onSubmit = (settings: AnalysisSettingsValues) => {
        if (!isSignedIn) {
            setView('signin')
            return
        }

        run.mutate(settings)
    }

    const isRunning = run.isPending || run.isSuccess

    const renderStatus = () => {
        if (run.error) {
            return <Alert type="error" showIcon title={toApiRequestError(run.error).message} />
        }

        if (stage === RunStage.Uploading) {
            return (
                <div>
                    <p className={styles.hint}>Uploading your video…</p>
                    <Progress percent={Math.round(uploadProgress * 100)} size="small" />
                </div>
            )
        }

        if (stage === RunStage.Creating || stage === RunStage.Starting) {
            return <p className={styles.hint}>Starting the analysis…</p>
        }

        return null
    }

    const renderQuota = () => {
        if (!quota) {
            return null
        }

        if (quota.limit === null) {
            return <p className={styles.hint}>Unlimited analyses</p>
        }

        if (!hasQuotaLeft && quota.windowStart) {
            return (
                <p className={styles.hint}>
                    You’ve used all {quota.limit} analyses for this week. More are available on{' '}
                    {formatResetDate(quota.windowStart)}.
                </p>
            )
        }

        return (
            <p className={styles.hint}>
                {quota.used} of {quota.limit} analyses used this week
            </p>
        )
    }

    return (
        <form className={cx(styles.panel, styles.settingsPanel)} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.panelTitle}>Where will it run?</h2>
            {source.kind === 'sample' && (
                <Alert
                    type="info"
                    showIcon
                    title={`Sample ad: ${source.sample.title}`}
                    description="Its platforms and markets are filled in. Change them to see how the results differ."
                />
            )}
            <div className={styles.settingsScroll}>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Platforms</label>
                    <Controller
                        name="platforms"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onChange={handlePlatformsChange}
                                onBlur={field.onBlur}
                                mode="multiple"
                                placeholder="Leave empty to check general rules only"
                                options={PLATFORM_OPTIONS}
                                allowClear
                            />
                        )}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Placements</label>
                    <Controller
                        name="placements"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                mode="multiple"
                                placeholder={
                                    platforms.length ? 'Adds the specs of each placement' : 'Pick a platform first'
                                }
                                options={getPlacementOptions(platforms)}
                                disabled={!platforms.length}
                                allowClear
                            />
                        )}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Markets</label>
                    <Controller
                        name="markets"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                mode="multiple"
                                placeholder="Adds local advertising rules"
                                options={MARKET_OPTIONS}
                                allowClear
                            />
                        )}
                    />
                </div>
            </div>
            {renderQuota()}
            <Button
                type="primary"
                size="large"
                block
                htmlType="submit"
                className={styles.runButton}
                icon={<ThunderboltOutlined />}
                loading={isRunning}
                disabled={isRunning || !hasQuotaLeft}
            >
                Run Analysis
            </Button>
            {renderStatus()}
        </form>
    )
}
