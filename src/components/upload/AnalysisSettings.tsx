'use client'

import { ApiRequestError, describeRequestError, toApiRequestError } from '@/api/errors'
import { createJob, createSampleJob, isAdmissionRefusal, startAnalysis } from '@/api/jobs'
import { authClient, signIn } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { isNetworkError, isRateLimited, runAuthQuery, runAuthRequest } from '@/auth/errors'
import { refreshSession } from '@/auth/session'
import { HumanCheck, type HumanCheckHandle } from '@/components/human-check/HumanCheck'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useAdmission } from '@/hooks/useAdmission'
import { useQuota } from '@/hooks/useQuota'
import { formatPlacementLabel, MARKET_LABELS, PLATFORM_LABELS } from '@/labels'
import { uploadToSignedUrl } from '@/storage/upload'
import { ThunderboltOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    type AnalysisSettingsInput,
    analysisSettingsSchema,
    type AnalysisSettings as AnalysisSettingsValues,
    type ApiErrorCode,
    Market,
    Placement,
    Platform,
    RequestErrorCode,
} from 'adlens-shared'
import { Alert, Button, Progress, Select } from 'antd'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
    getPlatformPlacements,
    toPlacementsForPlatforms,
    toPlatformsForPlacements,
    withPlatformPlacements,
} from './platform-placements'
import { readSettingsParams, writeSettingsToUrl } from './settings-url'
import { useStyles } from './styles'
import type { AnalysisSource } from './types'

type SessionCheck = 'active' | 'none' | 'unknown'

const PLATFORM_OPTIONS = Object.values(Platform).map((value) => ({ value, label: PLATFORM_LABELS[value] }))

const MARKET_OPTIONS = Object.values(Market).map((value) => ({ value, label: MARKET_LABELS[value] }))

const DEFAULT_VALUES: AnalysisSettingsInput = {
    platforms: [],
    placements: [],
    markets: [],
}

// A file takes the settings in the address: the ones applied before a reload, or to the video this one replaces.
// Rendered only once a video is chosen, so `window` is always there. A sample brings the settings it was published with.
const getDefaultValues = (source: AnalysisSource): AnalysisSettingsInput => {
    if (source.kind !== 'sample') {
        return readSettingsParams(window.location.search)
    }

    const { settings } = source.sample

    return {
        ...DEFAULT_VALUES,
        ...settings,
        placements: withPlatformPlacements(settings.platforms, settings.placements),
    }
}

const getPlacementOptions = (platforms: Platform[]) =>
    platforms.map((platform) => ({
        label: PLATFORM_LABELS[platform],
        options: getPlatformPlacements(platform).map((value) => ({ value, label: formatPlacementLabel(value) })),
    }))

// What a spent quota means the API would refuse: an account's week is used up, while an anonymous session or an
// unconfirmed account had a single analysis and needs an account or a confirmed email for more.
const getQuotaRefusal = (isEmailConfirmed: boolean, isAnonymous: boolean): RequestErrorCode => {
    if (isEmailConfirmed) {
        return RequestErrorCode.QuotaExceeded
    }

    return isAnonymous ? RequestErrorCode.SignUpRequired : RequestErrorCode.EmailConfirmationRequired
}

const formatNextFree = (nextFreeAt: string) =>
    new Date(nextFreeAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

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

    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    // When the API last refused a run: an admission answer from then on reflects that refusal.
    const [refusedAt, setRefusedAt] = useState(0)
    const humanCheck = useRef<HumanCheckHandle>(null)
    const { control, handleSubmit, getValues, setValue } = useForm<
        AnalysisSettingsInput,
        unknown,
        AnalysisSettingsValues
    >({
        resolver: zodResolver(analysisSettingsSchema),
        defaultValues: getDefaultValues(source),
    })
    const values = useWatch({ control })

    const { quota } = useQuota()
    const { refusal, updatedAt } = useAdmission()

    const platforms = values.platforms ?? []
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

            await startAnalysis(job.id)

            return job.id
        }

        const { file, contentType } = source
        const { job, upload } = await createJob({
            settings,
            file: { name: file.name, contentType, size: file.size },
            challengeToken,
        })

        setIsUploading(true)
        await uploadToSignedUrl({ target: upload, file, onProgress: setUploadProgress })
        setIsUploading(false)
        await startAnalysis(job.id)

        return job.id
    }

    const runAnalysis = async (settings: AnalysisSettingsValues): Promise<string> => {
        // Belt and braces: the disabled Run button already keeps this from firing while the session is still
        // loading, but a still-loading session must never reach the anonymous sign-in below either way. It fails
        // the run rather than returning, which would count as a success and leave Run loading for good.
        if (isInitializing) {
            throw new ApiRequestError(RequestErrorCode.Unavailable)
        }

        setUploadProgress(0)

        // Without an account, or with one whose email isn't confirmed, the API always asks for the check, so it
        // runs first: a visitor who can't pass it creates no anonymous user. Members skip it until the API asks
        // (past the network's soft limit).
        const isCheckRequired = !user || isAnonymous || !isEmailConfirmed
        let token: string | undefined

        if (isCheckRequired) {
            token = await getChallengeToken()
        }

        if (!user) {
            const sessionCheck = await checkSession()

            if (sessionCheck === 'unknown') {
                throw new ApiRequestError(RequestErrorCode.Unavailable)
            }

            if (sessionCheck === 'none') {
                await startAnonymousSession()
            }

            // The cookie holds a session this tab's state missed (its first fetch failed, or another tab signed in):
            // without catching up, the analysis page would ask to sign in.
            if (sessionCheck === 'active') {
                refreshSession()
            }
        }

        try {
            return await startRun(settings, token)
        } catch (err) {
            if (isCheckRequired || toApiRequestError(err).code !== RequestErrorCode.ChallengeRequired) {
                throw err
            }

            // The token is only read when a job is created, so the retry starts over with a new job.
            const retryToken = await getChallengeToken()

            return startRun(settings, retryToken)
        }
    }

    const run = useMutation({
        mutationFn: runAnalysis,
        onMutate: () => onRunningChange?.(true),
        onSuccess: (jobId) => {
            // The run may have just signed the visitor in anonymously, so the pre-run `user` id can be stale;
            // invalidating by prefix catches the new user's queries too, not just the one active before the run.
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['admission'] })
            void queryClient.invalidateQueries({ queryKey: ['jobs'] })
            router.push(`/analyses/${jobId}`)
        },
        onError: (error) => {
            const { code } = toApiRequestError(error)

            setIsUploading(false)
            onRunningChange?.(false)

            // A stale tab may not know the limit was reached; both answers catch up with the refusal.
            if (isAdmissionRefusal(code)) {
                setRefusedAt(Date.now())
                void queryClient.invalidateQueries({ queryKey: ['quota'] })
                void queryClient.invalidateQueries({ queryKey: ['admission'] })
            }

            // The same entry point as the header's Sign In: its dialog links to sign-up.
            if (code === RequestErrorCode.SignUpRequired) {
                setView('signin')
            }
        },
    })

    const isRunning = run.isPending || run.isSuccess
    const runError = run.error ? toApiRequestError(run.error) : null
    // A refused run keeps Run disabled until a newer admission answer replaces it (signing up, say, lifts it); when that
    // answer can't be had, the refusal itself still holds.
    const runRefusal = runError && isAdmissionRefusal(runError.code) && updatedAt < refusedAt ? runError.code : null
    const quotaRefusal = hasQuotaLeft ? null : getQuotaRefusal(isEmailConfirmed, isAnonymous)
    // While a run moves on, its own charge would read as a refusal.
    // An admission answer, even an admitting null, is newer than what the cached quota implies.
    const admissionRefusal = refusal !== undefined ? refusal : quotaRefusal
    const blockingRefusal = isRunning ? null : (runRefusal ?? admissionRefusal)

    const handlePlatformsChange = (next: Platform[]) => {
        setValue(
            'placements',
            toPlacementsForPlatforms(getValues('placements') ?? [], getValues('platforms') ?? [], next),
        )
        setValue('platforms', next)
    }

    const handlePlacementsChange = (next: Placement[]) => {
        setValue('placements', next)
        setValue('platforms', toPlatformsForPlacements(getValues('platforms') ?? [], next))
    }

    const onSubmit = (settings: AnalysisSettingsValues) => run.mutate(settings)

    const renderErrorAction = (code: ApiErrorCode) => {
        if (code === RequestErrorCode.NetworkQuotaExceeded) {
            return <Button onClick={() => setIsContactOpen(true)}>Contact us</Button>
        }

        if (code === RequestErrorCode.EmailConfirmationRequired) {
            return <Button onClick={() => setView('confirm')}>Confirm email</Button>
        }

        if (code === RequestErrorCode.SignUpRequired) {
            return <Button onClick={() => setView('signin')}>Sign In</Button>
        }

        return undefined
    }

    const renderNotice = () => {
        if (isRunning) {
            return null
        }

        if (blockingRefusal === RequestErrorCode.QuotaExceeded && quota?.nextFreeAt) {
            return (
                <p className={styles.hint}>
                    You’ve used all {quota.limit} analyses for the last 7 days. The next one is available on{' '}
                    {formatNextFree(quota.nextFreeAt)}.
                </p>
            )
        }

        if (blockingRefusal) {
            return (
                <Alert
                    type="info"
                    showIcon
                    title={describeRequestError(blockingRefusal)}
                    action={renderErrorAction(blockingRefusal)}
                />
            )
        }

        // A refusal a newer admission answer has replaced is no longer true.
        if (runError && !isAdmissionRefusal(runError.code)) {
            return <Alert type="error" showIcon title={runError.message} action={renderErrorAction(runError.code)} />
        }

        return quota?.limit === null ? <p className={styles.hint}>Unlimited analyses</p> : null
    }

    const renderUpload = () =>
        isUploading && (
            <div>
                <p className={styles.hint}>Uploading your video…</p>
                <Progress percent={Math.round(uploadProgress * 100)} size="small" />
            </div>
        )

    // The address holds the applied settings, so a reload or the next video keeps them.
    useEffect(() => writeSettingsToUrl(values), [values])

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
                                value={field.value}
                                onChange={handlePlacementsChange}
                                onBlur={field.onBlur}
                                mode="multiple"
                                // Seen only with no platform chosen, since a chosen platform keeps at least one
                                // placement. Nothing chosen is checked as everything (the API resolves it in full).
                                placeholder="Every placement is checked; pick a platform to narrow"
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
            {renderNotice()}
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
                disabled={isRunning || isInitializing || Boolean(blockingRefusal)}
            >
                Run Analysis
            </Button>
            {renderUpload()}
        </form>
    )
}
