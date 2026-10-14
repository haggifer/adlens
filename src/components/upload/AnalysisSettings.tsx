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
import { useRouter } from 'next/navigation'
import { useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toKnownSettings } from './known-settings'
import { getSampleSettings } from './sample-settings'
import { SettingsFields } from './SettingsFields'
import { SettingsPlaceholder } from './SettingsPlaceholder'
import { useStyles } from './styles'
import type { AnalysisSource } from './types'

const DEFAULT_VALUES: AnalysisSettingsInput = {
    platforms: [],
    placements: [],
    markets: [],
}

// A file takes the settings of the video it replaces; a sample brings the settings it was published with.
const getDefaultValues = (source: AnalysisSource, carried: AnalysisSettingsInput): AnalysisSettingsInput =>
    source.kind === 'sample' ? getSampleSettings(source.sample) : carried

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
    // Held by the workspace, since this panel remounts for each video and the settings and the applied preset carry
    // over to the next.
    settings: AnalysisSettingsInput
    onSettingsChange: (settings: AnalysisSettingsInput) => void
    appliedPresetId: string | null
    onAppliedPresetChange: (presetId: string | null) => void
    // True from Run until the run fails; a run that succeeds stays locked while the page navigates away.
    onRunningChange?: (isRunning: boolean) => void
    // A replacement video is being read: a run started now would be for the video about to be replaced.
    isVideoReading?: boolean
}

export function AnalysisSettings({
    source,
    settings,
    onSettingsChange,
    appliedPresetId,
    onAppliedPresetChange,
    onRunningChange,
    isVideoReading = false,
}: IProps) {
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
    // The spinner only ever covers the panel's first load. A session that starts later (the anonymous sign-in of a
    // first run or a first saved preset, or a sign-in) loads the presets again, and a spinner then would replace the
    // run's progress or an open Save as preset dialog.
    const [hasShownForm, setHasShownForm] = useState(false)
    const [defaultValues] = useState(() => getDefaultValues(source, settings))
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
    // Settings carried from the previous video win over the default preset, and a sample keeps its own.
    const isDefaultPresetAllowed = source.kind === 'file' && isSameSettings(defaultValues, DEFAULT_VALUES)
    const isPresetsLoaded = Boolean(user) && !isLoadingPresets
    const appliedPreset = presets.find((preset) => preset.id === appliedPresetId) ?? null
    // Until the session and the presets load, a default preset may still be on its way, and the fields would show blank.
    const isWaitingForDefault =
        !hasShownForm && isDefaultPresetAllowed && !appliedPresetId && (isInitializing || isLoadingPresets)

    if (!isWaitingForDefault && !hasShownForm) {
        setHasShownForm(true)
    }

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
        onSettingsChange(next)
    }

    // A preset saved under an older ruleset may name values that are gone; they drop, as from an outdated address.
    const handleApplyPreset = (preset: Preset) => {
        handleSettingsChange(toKnownSettings(preset.settings))
        onAppliedPresetChange(preset.id)
    }

    // Saved from the panel's settings, maybe edited in the dialog first: the panel takes the preset as saved, so it shows
    // as applied and a run counts towards it.
    const handlePresetSaved = handleApplyPreset

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

    // The presets load after the panel mounts, so the default preset can only be applied once they arrive; only that
    // first load counts, so a default set later (in another tab, say) never replaces settings mid-session. Before paint,
    // so the fields never show blank between the spinner and the default.
    useLayoutEffect(() => {
        if (isPresetsLoaded) {
            settleDefaultPreset()
        }
    }, [isPresetsLoaded])

    if (isWaitingForDefault) {
        return <SettingsPlaceholder />
    }

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
                disabled={isRunning || isInitializing || isVideoReading || Boolean(blockingRefusal)}
            >
                Run Analysis
            </Button>
            {renderUpload()}
        </form>
    )
}
