'use client'

import { ApiRequestError, describeRequestError, toApiRequestError } from '@/api/errors'
import { createJob, createSampleJob, isAdmissionRefusal, startAnalysis } from '@/api/jobs'
import { ensureSession } from '@/auth/anonymous-session'
import { useAuth } from '@/auth/AuthContext'
import { HumanCheck, type HumanCheckHandle } from '@/components/human-check/HumanCheck'
import { formatQuotaDate } from '@/components/layout/quota-label'
import { PresetActions } from '@/components/presets/PresetActions'
import { isSameSettings } from '@/components/presets/same-settings'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useAdmission } from '@/hooks/useAdmission'
import { PRESETS_KEY, usePresets } from '@/hooks/usePresets'
import { useQuota } from '@/hooks/useQuota'
import { uploadToSignedUrl } from '@/storage/upload'
import { ThunderboltOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    type AnalysisSettingsInput,
    analysisSettingsSchema,
    type AnalysisSettings as AnalysisSettingsValues,
    type ApiErrorCode,
    type Preset,
    RequestErrorCode,
} from 'adlens-shared'
import { Alert, Button, Progress } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { withPlatformPlacements } from './platform-placements'
import { SettingsFields } from './SettingsFields'
import { readSettingsParams, toKnownSettings, writeSettingsToUrl } from './settings-url'
import { useStyles } from './styles'
import type { AnalysisSource } from './types'

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

// What a spent quota means the API would refuse: an account's week is used up, while an anonymous session or an
// unconfirmed account had a single analysis and needs an account or a confirmed email for more.
const getQuotaRefusal = (isEmailConfirmed: boolean, isAnonymous: boolean): RequestErrorCode => {
    if (isEmailConfirmed) {
        return RequestErrorCode.QuotaExceeded
    }

    return isAnonymous ? RequestErrorCode.SignUpRequired : RequestErrorCode.EmailConfirmationRequired
}

interface IProps {
    source: AnalysisSource
    // Held by the workspace, since this panel remounts for each video and the applied preset carries over to the next.
    appliedPresetId: string | null
    onAppliedPresetChange: (presetId: string | null) => void
    // True from Run until the run fails; a run that succeeds stays locked while the page navigates away.
    onRunningChange?: (isRunning: boolean) => void
}

export function AnalysisSettings({ source, appliedPresetId, onAppliedPresetChange, onRunningChange }: IProps) {
    const { styles, cx } = useStyles()
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const { user, isAnonymous, isEmailConfirmed, isInitializing } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)

    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    // When the API last refused a run: an admission answer from then on reflects that refusal.
    const [refusedAt, setRefusedAt] = useState(0)
    const humanCheck = useRef<HumanCheckHandle>(null)
    const [defaultValues] = useState(() => getDefaultValues(source))
    // Set once the visitor picks settings or saves a preset, or the default preset had its one chance.
    const isDefaultSettled = useRef(false)
    const { control, handleSubmit, setValue } = useForm<AnalysisSettingsInput, unknown, AnalysisSettingsValues>({
        resolver: zodResolver(analysisSettingsSchema),
        defaultValues,
    })
    const values = useWatch({ control })

    const { quota } = useQuota()
    const { refusal, updatedAt } = useAdmission()
    const { presets, defaultPreset, isLoading: isLoadingPresets } = usePresets()

    // A null limit is an unlimited (admin) account.
    const hasQuotaLeft = !quota || quota.limit === null || quota.used < quota.limit
    // Settings the address carries win over the default preset, and a sample keeps its own.
    const isDefaultPresetAllowed = source.kind === 'file' && isSameSettings(defaultValues, DEFAULT_VALUES)
    const isPresetsLoaded = Boolean(user) && !isLoadingPresets
    const appliedPreset = presets.find((preset) => preset.id === appliedPresetId) ?? null

    const getChallengeToken = async (): Promise<string> => {
        if (!humanCheck.current) {
            throw new ApiRequestError(RequestErrorCode.ChallengeFailed)
        }

        return humanCheck.current.getToken()
    }

    const startRun = async (settings: AnalysisSettingsValues, challengeToken?: string): Promise<string> => {
        // A preset deleted since it was applied still goes out; the API counts nothing for it.
        const presetId = appliedPresetId ?? undefined

        if (source.kind === 'sample') {
            const job = await createSampleJob({ sampleId: source.sample.id, settings, presetId, challengeToken })

            await startAnalysis(job.id)

            return job.id
        }

        const { file, contentType } = source
        const { job, upload } = await createJob({
            settings,
            file: { name: file.name, contentType, size: file.size },
            presetId,
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
            await ensureSession()
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
        onSuccess: () => {
            // The run may have just signed the visitor in anonymously, so the pre-run `user` id can be stale;
            // invalidating by prefix catches the new user's queries too, not just the one active before the run.
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['admission'] })
            void queryClient.invalidateQueries({ queryKey: ['jobs'] })
            // The server may have counted the run towards the applied preset.
            void queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] })
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

    const handleSettingsChange = (next: AnalysisSettingsInput) => {
        isDefaultSettled.current = true
        setValue('platforms', next.platforms, { shouldDirty: true })
        setValue('placements', next.placements, { shouldDirty: true })
        setValue('markets', next.markets, { shouldDirty: true })
    }

    // A preset saved under an older ruleset may name values that are gone; they drop, as from an outdated address.
    const handleApplyPreset = (preset: Preset) => {
        handleSettingsChange(toKnownSettings(preset.settings))
        onAppliedPresetChange(preset.id)
    }

    // The preset was saved from the panel's settings, so it is the one they now run with.
    const handlePresetSaved = (preset: Preset) => {
        isDefaultSettled.current = true
        onAppliedPresetChange(preset.id)
    }

    const settleDefaultPreset = useEffectEvent(() => {
        if (isDefaultSettled.current) {
            return
        }

        isDefaultSettled.current = true

        // Once Run was pressed, a late default would change the fields under the run, or after it the settings it ran
        // with; a preset carried over from the previous video stays.
        if (defaultPreset && isDefaultPresetAllowed && !appliedPresetId && run.isIdle) {
            handleApplyPreset(defaultPreset)
        }
    })

    // A per-call callback, which TanStack skips once this form has unmounted: a visitor who left the page mid-run
    // isn't pulled back to the analysis, though the run (already charged) still finishes.
    const onSubmit = (settings: AnalysisSettingsValues) =>
        run.mutate(settings, { onSuccess: (jobId) => router.push(`/analyses/${jobId}`) })

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
                    {formatQuotaDate(quota.nextFreeAt)}.
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

    // The address holds the applied settings, so a reload or the next video keeps them. A navigation that drops them
    // while the form keeps them (Analyze in the header links to a bare /) writes them back.
    useEffect(() => writeSettingsToUrl(values), [values, searchParams])

    // The presets load after the panel mounts, so the default preset can only be applied once they arrive; only that
    // first load counts, so a default set later (in another tab, say) never replaces settings mid-session.
    useEffect(() => {
        if (isPresetsLoaded) {
            settleDefaultPreset()
        }
    }, [isPresetsLoaded])

    return (
        <form className={cx(styles.panel, styles.settingsPanel)} onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Where will it run?</h2>
                <PresetActions
                    settings={values}
                    appliedPreset={appliedPreset}
                    onApply={handleApplyPreset}
                    onSaved={handlePresetSaved}
                    isDisabled={isRunning}
                />
            </div>
            <div className={styles.settingsScroll}>
                <SettingsFields value={values} onChange={handleSettingsChange} isDisabled={isRunning} />
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
