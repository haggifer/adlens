'use client'

import { ThunderboltOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    type AnalysisSettings as AnalysisSettingsValues,
    type AnalysisSettingsInput,
    analysisSettingsSchema,
    type ApiErrorCode,
    Market,
    Placement,
    PLACEMENT_PLATFORM,
    Platform,
    RequestErrorCode,
} from 'adlens-shared'
import { Alert, Button, Progress, Select } from 'antd'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ApiRequestError, describeRequestError, toApiRequestError } from '@/api/errors'
import { createJob, createSampleJob, startAnalysis } from '@/api/jobs'
import { useAuth } from '@/auth/AuthContext'
import { authClient, signIn } from '@/auth/authClient'
import { isNetworkError, isRateLimited, runAuthQuery, runAuthRequest } from '@/auth/errors'
import { HumanCheck, type HumanCheckHandle } from '@/components/human-check/HumanCheck'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useQuota } from '@/hooks/useQuota'
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

const formatNextFree = (nextFreeAt: string) =>
    new Date(nextFreeAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

// Refusals that mean the visitor's quota is spent, which a stale tab may not know yet.
const LIMIT_CODES: ApiErrorCode[] = [
    RequestErrorCode.SignUpRequired,
    RequestErrorCode.EmailConfirmationRequired,
    RequestErrorCode.QuotaExceeded,
    RequestErrorCode.NetworkQuotaExceeded,
]

type SessionCheck = 'active' | 'none' | 'unknown'

// A `get-session` blip can leave the client's own state momentarily null for an otherwise signed-in member; a fresh
// fetch confirms there really is no session before signing in anonymously overwrites that member's cookie. Any
// error, a network failure included, counts as "couldn't tell": only a clean response with no user may proceed.
const checkSession = async (): Promise<SessionCheck> => {
    const { data, error } = await runAuthQuery(() => authClient.getSession())

    if (error) {
        return 'unknown'
    }

    return data?.user ? 'active' : 'none'
}

// Visitors get an anonymous session only when they start an analysis, so crawlers and passers-by create no users.
const startAnonymousSession = async (): Promise<void> => {
    const error = await runAuthRequest(() => signIn.anonymous())

    if (!error) {
        return
    }

    if (isRateLimited(error)) {
        throw new ApiRequestError(RequestErrorCode.RateLimited)
    }

    throw new ApiRequestError(isNetworkError(error) ? RequestErrorCode.Unavailable : RequestErrorCode.Internal)
}

enum RunStage {
    Idle = 'idle',
    Creating = 'creating',
    Uploading = 'uploading',
    Starting = 'starting',
}

interface IProps {
    source: AnalysisSource
    // True from Run until the run fails; a run that succeeds stays locked while the page navigates away.
    onRunningChange?: (isRunning: boolean) => void
}

export function AnalysisSettings({ source, onRunningChange }: IProps) {
    const { styles, cx } = useStyles()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { user, isAnonymous, isEmailConfirmed, isInitializing } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const { quota } = useQuota()
    const [stage, setStage] = useState<RunStage>(RunStage.Idle)
    const [uploadProgress, setUploadProgress] = useState(0)
    const humanCheck = useRef<HumanCheckHandle>(null)
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

    const getChallengeToken = async (): Promise<string> => {
        if (!humanCheck.current) {
            throw new ApiRequestError(RequestErrorCode.ChallengeFailed)
        }

        return humanCheck.current.getToken()
    }

    const startRun = async (settings: AnalysisSettingsValues, challengeToken?: string): Promise<string> => {
        if (source.kind === 'sample') {
            const job = await createSampleJob({ sampleId: source.sample.id, settings, challengeToken })

            setStage(RunStage.Starting)
            await startAnalysis(job.id)

            return job.id
        }

        const { file, contentType } = source
        const { job, upload } = await createJob({
            settings,
            file: { name: file.name, contentType, size: file.size },
            challengeToken,
        })

        setStage(RunStage.Uploading)
        await uploadToSignedUrl({ target: upload, file, onProgress: setUploadProgress })
        setStage(RunStage.Starting)
        await startAnalysis(job.id)

        return job.id
    }

    const run = useMutation({
        mutationFn: async (settings: AnalysisSettingsValues): Promise<string> => {
            // Belt and braces: the disabled Run button already keeps this from firing while the session is still
            // loading, but a still-loading session must never reach the anonymous sign-in below either way. It fails
            // the run rather than returning, which would count as a success and leave Run loading for good.
            if (isInitializing) {
                throw new ApiRequestError(RequestErrorCode.Unavailable)
            }

            setStage(RunStage.Creating)
            setUploadProgress(0)

            // Without an account, or with one whose email isn't confirmed, the API always asks for the check, so it
            // runs first: a visitor who can't pass it creates no anonymous user. Members skip it until the API asks
            // (past the network's soft limit).
            const needsCheck = !user || isAnonymous || !isEmailConfirmed
            const token = needsCheck ? await getChallengeToken() : undefined

            if (!user) {
                const sessionCheck = await checkSession()

                if (sessionCheck === 'unknown') {
                    throw new ApiRequestError(RequestErrorCode.Unavailable)
                }

                if (sessionCheck === 'none') {
                    await startAnonymousSession()
                }
            }

            try {
                return await startRun(settings, token)
            } catch (err) {
                if (needsCheck || toApiRequestError(err).code !== RequestErrorCode.ChallengeRequired) {
                    throw err
                }

                // The token is only read when a job is created, so the retry starts over with a new job.
                const retryToken = await getChallengeToken()

                return startRun(settings, retryToken)
            }
        },
        onMutate: () => onRunningChange?.(true),
        onSuccess: (jobId) => {
            // The run may have just signed the visitor in anonymously, so the pre-run `user` id can be stale;
            // invalidating by prefix catches the new user's queries too, not just the one active before the run.
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['jobs'] })
            router.push(`/analyses/${jobId}`)
        },
        onError: (error) => {
            const { code } = toApiRequestError(error)

            setStage(RunStage.Idle)
            onRunningChange?.(false)

            if (LIMIT_CODES.includes(code)) {
                void queryClient.invalidateQueries({ queryKey: ['quota'] })
            }

            if (code === RequestErrorCode.SignUpRequired) {
                setView('signup')
            }
        },
    })

    const handlePlatformsChange = (next: Platform[]) => {
        setValue('platforms', next)
        setValue(
            'placements',
            (getValues('placements') ?? []).filter((placement) => next.includes(PLACEMENT_PLATFORM[placement])),
        )
    }

    const onSubmit = (settings: AnalysisSettingsValues) => run.mutate(settings)

    const isRunning = run.isPending || run.isSuccess

    const renderErrorAction = (code: ApiErrorCode) => {
        if (code === RequestErrorCode.NetworkQuotaExceeded) {
            return (
                <Button size="small" onClick={() => setIsContactOpen(true)}>
                    Contact us
                </Button>
            )
        }

        if (code === RequestErrorCode.EmailConfirmationRequired) {
            return (
                <Button size="small" onClick={() => setView('confirm')}>
                    Confirm email
                </Button>
            )
        }

        if (code === RequestErrorCode.SignUpRequired) {
            return (
                <Button size="small" onClick={() => setView('signup')}>
                    Sign up
                </Button>
            )
        }

        return undefined
    }

    const renderStatus = () => {
        if (run.error) {
            const error = toApiRequestError(run.error)

            // The refreshed quota says the same, with the date the next analysis is free.
            if (error.code === RequestErrorCode.QuotaExceeded && !hasQuotaLeft && quota?.nextFreeAt) {
                return null
            }

            return <Alert type="error" showIcon title={error.message} action={renderErrorAction(error.code)} />
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

        // Without a confirmed account the one analysis doesn't come back with time: the next needs an account.
        if (!hasQuotaLeft && !isEmailConfirmed) {
            // Once a run is refused, its error under Run says this, with the same button.
            if (run.error) {
                return null
            }

            const code = isAnonymous ? RequestErrorCode.SignUpRequired : RequestErrorCode.EmailConfirmationRequired

            return <Alert type="info" showIcon title={describeRequestError(code)} action={renderErrorAction(code)} />
        }

        if (!hasQuotaLeft && quota.nextFreeAt) {
            return (
                <p className={styles.hint}>
                    You’ve used all {quota.limit} analyses for the last 7 days. The next one is available on{' '}
                    {formatNextFree(quota.nextFreeAt)}.
                </p>
            )
        }

        return (
            <p className={styles.hint}>
                {quota.used} of {quota.limit} analyses used in the last 7 days
            </p>
        )
    }

    return (
        <form className={cx(styles.panel, styles.settingsPanel)} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.panelTitle}>Where will it run?</h2>
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
                                placeholder="Leave empty to check every platform"
                                options={PLATFORM_OPTIONS}
                                disabled={isRunning}
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
                                disabled={!platforms.length || isRunning}
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
                                placeholder="Leave empty to check every market"
                                options={MARKET_OPTIONS}
                                disabled={isRunning}
                                allowClear
                            />
                        )}
                    />
                </div>
            </div>
            <HumanCheck ref={humanCheck} action="start the analysis" />
            {renderQuota()}
            <Button
                type="primary"
                size="large"
                block
                htmlType="submit"
                className={styles.runButton}
                icon={<ThunderboltOutlined />}
                loading={isRunning}
                // Waiting out `isInitializing` keeps a member's still-loading session from being replaced by an
                // anonymous one.
                disabled={isRunning || !hasQuotaLeft || isInitializing}
            >
                Run Analysis
            </Button>
            {renderStatus()}
        </form>
    )
}
