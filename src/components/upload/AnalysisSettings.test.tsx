import { ApiRequestError, describeRequestError } from '@/api/errors'
import { createJob, createSampleJob, getAdmissionRefusal, startAnalysis } from '@/api/jobs'
import { getQuota } from '@/api/me'
import { createPreset, listPresets } from '@/api/presets'
import { authClient, signIn } from '@/auth/authClient'
import { refreshSession } from '@/auth/session'
import type { AuthContextValue } from '@/auth/AuthContext'
import { formatQuotaDate } from '@/components/layout/quota-label'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import type { UseQuotaResult } from '@/hooks/useQuota'
import { MARKET_LABELS, PLATFORM_LABELS } from '@/labels'
import { uploadToSignedUrl } from '@/storage/upload'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { buildJob, buildPreset, buildSample } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import {
    type AnalysisSettingsInput,
    type Job,
    Market,
    Platform,
    type Preset,
    type Quota,
    RequestErrorCode,
    type UploadTarget,
    VideoMimeType,
} from 'adlens-shared'
import { useState } from 'react'
import { AnalysisSettings } from './AnalysisSettings'
import { getPlatformPlacements, withPlatformPlacements } from './platform-placements'
import type { AnalysisSource } from './types'

const mockPush = jest.fn()
const mockChallengeToken = 'challenge-token'
const mockGetToken = jest.fn<Promise<string>, []>()
const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockUseQuota = jest.fn<UseQuotaResult, []>()
let mockQuota: Quota | undefined

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { getSession: jest.fn() },
    signIn: { anonymous: jest.fn() },
}))
jest.mock('@/auth/session', () => ({ refreshSession: jest.fn() }))
jest.mock('@/api/jobs', () => ({
    ...jest.requireActual<typeof import('@/api/jobs')>('@/api/jobs'),
    createJob: jest.fn(),
    createSampleJob: jest.fn(),
    getAdmissionRefusal: jest.fn(),
    startAnalysis: jest.fn(),
}))
jest.mock('@/api/me', () => ({ getQuota: jest.fn() }))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn(), createPreset: jest.fn() }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => mockUseQuota() }))
jest.mock('@/storage/upload', () => ({ uploadToSignedUrl: jest.fn() }))
// Turnstile's widget can't run in jsdom; the stand-in hands out whatever mockGetToken resolves with.
jest.mock('@/components/human-check/HumanCheck', () => {
    const { useImperativeHandle } = jest.requireActual<typeof import('react')>('react')

    return {
        HumanCheck: ({ ref }: { ref: unknown }) => {
            useImperativeHandle(ref as never, () => ({ getToken: () => mockGetToken() }))
            return null
        },
    }
})

const SAMPLE = buildSample()

const SAMPLE_SOURCE: AnalysisSource = { kind: 'sample', sample: SAMPLE }

// The sample names its platforms only; each brings all of its placements.
const SAMPLE_RUN_SETTINGS = {
    ...SAMPLE.settings,
    placements: withPlatformPlacements(SAMPLE.settings.platforms, SAMPLE.settings.placements),
}

const FILE = new File(['video-bytes'], 'launch.mp4', { type: VideoMimeType.Mp4 })

const FILE_SOURCE: AnalysisSource = { kind: 'file', file: FILE, contentType: VideoMimeType.Mp4, url: 'blob:launch' }

const JOB: Job = buildJob({ id: 'job-7' })

const UPLOAD_TARGET: UploadTarget = {
    url: 'https://storage.googleapis.com/bucket/video?X-Goog-Signature=abc',
    headers: { 'Content-Type': VideoMimeType.Mp4 },
}

const UNAVAILABLE_COPY = describeRequestError(RequestErrorCode.Unavailable)

const CONFIRMATION_REQUIRED_COPY = describeRequestError(RequestErrorCode.EmailConfirmationRequired)

const SIGN_UP_REQUIRED_COPY = describeRequestError(RequestErrorCode.SignUpRequired)

const NEXT_FREE_AT = '2026-10-08T09:30:00.000Z'

const PRESET: Preset = buildPreset({
    id: 'preset-1',
    name: 'Meta UK',
    settings: { platforms: [Platform.Meta], placements: getPlatformPlacements(Platform.Meta), markets: [Market.UK] },
    lastUsedAt: '2026-10-10T09:00:00.000Z',
})

const DEFAULT_PRESET: Preset = buildPreset({
    id: 'preset-2',
    name: 'TikTok US',
    settings: {
        platforms: [Platform.TikTok],
        placements: getPlatformPlacements(Platform.TikTok),
        markets: [Market.US],
    },
    isDefault: true,
})

// Holds the applied preset the way the workspace does, across the panel's remounts.
const NO_SETTINGS: AnalysisSettingsInput = { platforms: [], placements: [], markets: [] }

// Holds what the workspace holds: the settings and the preset carried over from the previous video.
const Panel = ({ source, carried = NO_SETTINGS }: { source: AnalysisSource; carried?: AnalysisSettingsInput }) => {
    const [settings, setSettings] = useState(carried)
    const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null)

    return (
        <AnalysisSettings
            source={source}
            settings={settings}
            onSettingsChange={setSettings}
            appliedPresetId={appliedPresetId}
            onAppliedPresetChange={setAppliedPresetId}
        />
    )
}

const renderSettings = (
    auth: AuthContextValue,
    source: AnalysisSource = SAMPLE_SOURCE,
    carried: AnalysisSettingsInput = NO_SETTINGS,
) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<Panel source={source} carried={carried} />)
}

const runButton = () => screen.getByRole('button', { name: /run analysis/i })

// A member's upload waits for the presets (a default preset may fill the fields), so the panel shows a spinner first.
const renderFilePanel = async (auth: AuthContextValue) => {
    const result = renderSettings(auth, FILE_SOURCE)

    await screen.findByRole('button', { name: /run analysis/i })

    return result
}

// The date sits inside the sentence that names it, so it is looked for within an element's own text.
const queryNextFreeDate = () => screen.queryByText((text) => text.includes(formatQuotaDate(NEXT_FREE_AT)))

const isAboveRun = (element: Element) =>
    Boolean(element.compareDocumentPosition(runButton()) & Node.DOCUMENT_POSITION_FOLLOWING)

const run = async (user: UserEvent) => {
    await user.click(runButton())
}

// Label queries: once the preset modal's styles have loaded, role queries resolve computed styles for seconds.
const getSelectedIcon = (preset: Preset) => screen.queryByLabelText(`Preset: ${preset.name}`)

const getRunButtonByText = () => screen.getByText('Run Analysis').closest('button') as HTMLElement

const getSaveButtonByText = () => screen.getByText('Save').closest('button') as HTMLElement

const getMarketsSelect = () => screen.getAllByRole('combobox')[2]

// A chosen option shows twice, as a tag and in the open list, so the list entry is picked by its class.
const toggleOption = async (user: UserEvent, select: HTMLElement, label: string) => {
    await user.click(select)

    const matches = await screen.findAllByTitle(label)
    const option = matches.find((match) => match.classList.contains('ant-select-item-option'))

    await user.click(option ?? matches[0])
}

// The popover preselects the last used preset.
const applyLastUsedPreset = async (user: UserEvent) => {
    const applyPreset = screen.getByLabelText('Apply a preset')

    await waitFor(() => expect(applyPreset).toBeEnabled())
    await user.click(applyPreset)
    await user.click(await screen.findByRole('button', { name: 'Apply' }))
}

describe('AnalysisSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockQuota = undefined
        mockUseQuota.mockImplementation(() => ({ quota: mockQuota }))
        useAuthModalStore.setState({ view: null })
        useContactModalStore.setState({ isOpen: false })
        jest.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null } as never)
        jest.mocked(signIn.anonymous).mockResolvedValue({ data: null, error: null } as never)
        jest.mocked(getAdmissionRefusal).mockResolvedValue(null)
        jest.mocked(createSampleJob).mockResolvedValue(JOB)
        jest.mocked(createJob).mockResolvedValue({ job: JOB, upload: UPLOAD_TARGET })
        jest.mocked(startAnalysis).mockResolvedValue(JOB)
        jest.mocked(uploadToSignedUrl).mockResolvedValue(undefined)
        jest.mocked(listPresets).mockResolvedValue([])
        mockGetToken.mockResolvedValue(mockChallengeToken)
    })

    afterEach(() => jest.restoreAllMocks())

    describe('for a visitor without a session', () => {
        it('runs the check on Run, then signs in anonymously and opens the analysis', async () => {
            const queryClient = createTestQueryClient()

            // The run creates a new anonymous user, whose queries the pre-run user id wouldn't match.
            queryClient.setQueryData(['quota', 'anon-new'], { used: 0, limit: 3, nextFreeAt: null })
            mockUseAuth.mockReturnValue(signedOutAuth())
            const { user } = renderWithProviders(<Panel source={SAMPLE_SOURCE} />, queryClient)

            expect(runButton()).toBeEnabled()
            expect(mockGetToken).not.toHaveBeenCalled()

            await run(user)

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(createSampleJob).toHaveBeenCalledWith({
                sampleId: SAMPLE.id,
                settings: SAMPLE_RUN_SETTINGS,
                challengeToken: mockChallengeToken,
            })
            // No anonymous user is created for a visitor who can't pass the check.
            expect(mockGetToken.mock.invocationCallOrder[0]).toBeLessThan(
                jest.mocked(signIn.anonymous).mock.invocationCallOrder[0],
            )
            expect(jest.mocked(signIn.anonymous).mock.invocationCallOrder[0]).toBeLessThan(
                jest.mocked(createSampleJob).mock.invocationCallOrder[0],
            )
            expect(startAnalysis).toHaveBeenCalledWith(JOB.id)
            expect(queryClient.getQueryState(['quota', 'anon-new'])?.isInvalidated).toBe(true)
        })

        it('uses the session it finds instead of signing in anonymously over it, and catches the page up', async () => {
            jest.mocked(authClient.getSession).mockResolvedValueOnce({
                data: { user: { id: 'member-1' } },
                error: null,
            } as never)
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(signIn.anonymous).not.toHaveBeenCalled()
            expect(refreshSession).toHaveBeenCalledTimes(1)
        })

        it('doesn’t sign in anonymously when the session check fails, and lets the visitor retry', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

            jest.mocked(authClient.getSession).mockRejectedValueOnce(new TypeError('Failed to fetch'))
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            expect(await screen.findByText(UNAVAILABLE_COPY)).toBeInTheDocument()
            expect(consoleError).toHaveBeenCalled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
            expect(createSampleJob).not.toHaveBeenCalled()
            expect(runButton()).toBeEnabled()

            await run(user)

            await waitFor(() => expect(createSampleJob).toHaveBeenCalledTimes(1))
            // A Turnstile token works once, so the retry ran a new check.
            expect(mockGetToken).toHaveBeenCalledTimes(2)
        })

        it('treats a session check the API answered with an error as unknown', async () => {
            jest.mocked(authClient.getSession).mockResolvedValueOnce({
                data: null,
                error: { status: 500 },
            } as never)
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            expect(await screen.findByText(UNAVAILABLE_COPY)).toBeInTheDocument()
            expect(signIn.anonymous).not.toHaveBeenCalled()
        })

        it('stops before signing in when the check fails, and says so', async () => {
            mockGetToken.mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.ChallengeFailed))
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            expect(await screen.findByText(describeRequestError(RequestErrorCode.ChallengeFailed))).toBeInTheDocument()
            expect(authClient.getSession).not.toHaveBeenCalled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
            expect(createSampleJob).not.toHaveBeenCalled()
        })

        it('explains a rate-limited anonymous sign-in and creates no job', async () => {
            jest.mocked(signIn.anonymous).mockResolvedValueOnce({ data: null, error: { status: 429 } } as never)
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            expect(await screen.findByText(describeRequestError(RequestErrorCode.RateLimited))).toBeInTheDocument()
            expect(createSampleJob).not.toHaveBeenCalled()
        })
    })

    describe('while the session is still loading', () => {
        it('keeps Run disabled, and never signs in anonymously', () => {
            renderSettings(initializingAuth())

            expect(runButton()).toBeDisabled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
        })

        it('fails a run submitted anyway, instead of leaving it loading as a success', async () => {
            renderSettings(initializingAuth())

            // The Run button is disabled, so only a direct submit (Enter in a field, a script) reaches the handler.
            fireEvent.submit(runButton().closest('form') as HTMLFormElement)

            expect(await screen.findByText(UNAVAILABLE_COPY)).toBeInTheDocument()
            expect(authClient.getSession).not.toHaveBeenCalled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
            expect(createSampleJob).not.toHaveBeenCalled()
        })
    })

    describe('for a member', () => {
        it('runs without the check, and never signs them in again', async () => {
            const { user } = renderSettings(memberAuth())

            await user.click(runButton())

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(createSampleJob).toHaveBeenCalledWith({
                sampleId: SAMPLE.id,
                settings: SAMPLE_RUN_SETTINGS,
                challengeToken: undefined,
            })
            expect(authClient.getSession).not.toHaveBeenCalled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
            expect(mockGetToken).not.toHaveBeenCalled()
        })

        it('runs the check and tries again when the API asks a member for one', async () => {
            jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.ChallengeRequired))
            const { user } = renderSettings(memberAuth())

            await run(user)

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(mockGetToken).toHaveBeenCalledTimes(1)
            expect(createSampleJob).toHaveBeenLastCalledWith({
                sampleId: SAMPLE.id,
                settings: SAMPLE_RUN_SETTINGS,
                challengeToken: mockChallengeToken,
            })
        })

        it('offers the contact form when the network hit its hard limit', async () => {
            // The check before the run still allowed it; the one after says what the run was told.
            jest.mocked(getAdmissionRefusal)
                .mockResolvedValueOnce(null)
                .mockResolvedValue(RequestErrorCode.NetworkQuotaExceeded)
            jest.mocked(createSampleJob).mockRejectedValueOnce(
                new ApiRequestError(RequestErrorCode.NetworkQuotaExceeded),
            )
            const { user } = renderSettings(memberAuth())

            await user.click(runButton())
            await user.click(await screen.findByRole('button', { name: 'Contact us' }))

            expect(useContactModalStore.getState().isOpen).toBe(true)
        })

        it('says nothing about the quota while analyses are left', () => {
            mockQuota = { used: 2, limit: 3, nextFreeAt: null }
            renderSettings(memberAuth())

            expect(screen.queryByText(/analyses/)).not.toBeInTheDocument()
            expect(runButton()).toBeEnabled()
        })

        it('disables Run once the quota is used up, and says when the next analysis is free', () => {
            mockQuota = { used: 3, limit: 3, nextFreeAt: '2026-10-01T09:30:00.000Z' }
            renderSettings(memberAuth())

            expect(
                screen.getByText(/You’ve used all 3 analyses for the last 7 days. The next one is available on/),
            ).toBeInTheDocument()
            expect(runButton()).toBeDisabled()
        })

        it('never disables Run for an unlimited account', () => {
            mockQuota = { used: 40, limit: null, nextFreeAt: null }
            renderSettings(memberAuth())

            expect(screen.getByText('Unlimited analyses')).toBeInTheDocument()
            expect(runButton()).toBeEnabled()
        })
    })

    describe('for an account whose email isn’t confirmed', () => {
        it('runs the check on every Run, without signing in anonymously', async () => {
            const { user } = renderSettings(unconfirmedAuth())

            await run(user)

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(createSampleJob).toHaveBeenCalledWith({
                sampleId: SAMPLE.id,
                settings: SAMPLE_RUN_SETTINGS,
                challengeToken: mockChallengeToken,
            })
            expect(authClient.getSession).not.toHaveBeenCalled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
        })

        it('offers Confirm email when the API asks for a confirmed address', async () => {
            jest.mocked(getAdmissionRefusal)
                .mockResolvedValueOnce(null)
                .mockResolvedValue(RequestErrorCode.EmailConfirmationRequired)
            jest.mocked(createSampleJob).mockRejectedValueOnce(
                new ApiRequestError(RequestErrorCode.EmailConfirmationRequired),
            )
            const { user } = renderSettings(unconfirmedAuth())

            await run(user)

            expect(await screen.findByText(CONFIRMATION_REQUIRED_COPY)).toBeInTheDocument()
            // Unlike sign-up, confirming waits for the visitor to ask: the email may already be on its way.
            expect(useAuthModalStore.getState().view).toBeNull()

            await user.click(screen.getByRole('button', { name: 'Confirm email' }))

            expect(useAuthModalStore.getState().view).toBe('confirm')
        })

        it('asks to confirm the email once its analysis is used, instead of naming a date', () => {
            mockQuota = { used: 1, limit: 1, nextFreeAt: NEXT_FREE_AT }
            renderSettings(unconfirmedAuth())

            expect(screen.getByText(CONFIRMATION_REQUIRED_COPY)).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Confirm email' })).toBeInTheDocument()
            expect(queryNextFreeDate()).not.toBeInTheDocument()
            expect(runButton()).toBeDisabled()
        })
    })

    it('asks an anonymous visitor to sign up once their analysis is used, instead of naming a date', async () => {
        mockQuota = { used: 1, limit: 1, nextFreeAt: NEXT_FREE_AT }
        jest.mocked(getAdmissionRefusal).mockResolvedValue(RequestErrorCode.SignUpRequired)
        const { user } = renderSettings(anonymousAuth())

        expect(screen.getByText(SIGN_UP_REQUIRED_COPY)).toBeInTheDocument()
        expect(queryNextFreeDate()).not.toBeInTheDocument()
        expect(runButton()).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Sign In' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('says every placement is checked until a platform is chosen', () => {
        renderSettings(memberAuth(), {
            kind: 'sample',
            sample: { ...SAMPLE, settings: { platforms: [], placements: [], markets: [] } },
        })

        expect(screen.getByText('Every placement is checked; pick a platform to narrow')).toBeInTheDocument()
    })

    describe('checking in advance whether the analysis would be admitted', () => {
        it('disables Run and says why, above it, before a visitor without a session tries', async () => {
            jest.mocked(getAdmissionRefusal).mockResolvedValue(RequestErrorCode.SignUpRequired)
            const { user } = renderSettings(signedOutAuth())

            const notice = await screen.findByText(SIGN_UP_REQUIRED_COPY)

            expect(runButton()).toBeDisabled()
            expect(isAboveRun(notice)).toBe(true)

            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            expect(useAuthModalStore.getState().view).toBe('signin')
            expect(createSampleJob).not.toHaveBeenCalled()
        })

        it('falls back on a refused run: its message goes above Run and Run stays disabled', async () => {
            jest.mocked(getAdmissionRefusal)
                .mockResolvedValueOnce(null)
                .mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
            jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.SignUpRequired))
            const { user } = renderSettings(anonymousAuth())

            await waitFor(() => expect(getAdmissionRefusal).toHaveBeenCalledTimes(1))
            await run(user)

            const notice = await screen.findByText(SIGN_UP_REQUIRED_COPY)

            await waitFor(() => expect(getAdmissionRefusal).toHaveBeenCalledTimes(2))
            expect(runButton()).toBeDisabled()
            expect(isAboveRun(notice)).toBe(true)
        })

        it('lets Run go when the API admits the analysis, though the cached quota looks used up', async () => {
            mockQuota = { used: 3, limit: 3, nextFreeAt: NEXT_FREE_AT }
            renderSettings(memberAuth())

            expect(runButton()).toBeDisabled()

            await waitFor(() => expect(runButton()).toBeEnabled())
            expect(queryNextFreeDate()).not.toBeInTheDocument()
        })

        it('lets Run go again once a newer answer admits the analysis', async () => {
            jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.QuotaExceeded))
            const { user } = renderSettings(memberAuth())

            await waitFor(() => expect(getAdmissionRefusal).toHaveBeenCalledTimes(1))
            await run(user)

            await waitFor(() => expect(getAdmissionRefusal).toHaveBeenCalledTimes(2))
            await waitFor(() => expect(runButton()).toBeEnabled())
            expect(screen.queryByText(describeRequestError(RequestErrorCode.QuotaExceeded))).not.toBeInTheDocument()
        })
    })

    it('keeps the limit message hidden while a run that just used the analysis moves on', async () => {
        mockQuota = { used: 0, limit: 1, nextFreeAt: null }
        jest.mocked(startAnalysis).mockImplementation(async () => {
            // The run charged the analysis, and the refreshed quota says so before the page navigates away.
            mockQuota = { used: 1, limit: 1, nextFreeAt: null }

            return JOB
        })
        const { user } = renderSettings(anonymousAuth())

        await run(user)

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
        expect(screen.queryByText(SIGN_UP_REQUIRED_COPY)).not.toBeInTheDocument()
    })

    it('opens sign-in when the network’s analyses without an account are used up', async () => {
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.SignUpRequired))
        const { user } = renderSettings(anonymousAuth())

        await run(user)

        await waitFor(() => expect(useAuthModalStore.getState().view).toBe('signin'))
        expect(signIn.anonymous).not.toHaveBeenCalled()
    })

    it('refreshes the quota after a refused run, and shows its limit message once', async () => {
        // The real hook, so the refusal's effect on the quota query shows.
        mockUseQuota.mockImplementation(
            jest.requireActual<typeof import('@/hooks/useQuota')>('@/hooks/useQuota').useQuota,
        )
        jest.mocked(getQuota)
            .mockResolvedValueOnce({ used: 0, limit: 1, nextFreeAt: null })
            .mockResolvedValue({ used: 1, limit: 1, nextFreeAt: '2026-10-08T09:30:00.000Z' })
        jest.mocked(getAdmissionRefusal).mockResolvedValueOnce(null).mockResolvedValue(RequestErrorCode.SignUpRequired)
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.SignUpRequired))
        const { user } = renderSettings(anonymousAuth())

        await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1))

        await run(user)

        await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(runButton()).toBeDisabled())
        expect(screen.getAllByText(SIGN_UP_REQUIRED_COPY)).toHaveLength(1)
        expect(screen.getAllByRole('button', { name: 'Sign In' })).toHaveLength(1)
    })

    it('lets the refreshed quota say when a member’s next analysis is free, instead of a second limit message', async () => {
        mockUseQuota.mockImplementation(
            jest.requireActual<typeof import('@/hooks/useQuota')>('@/hooks/useQuota').useQuota,
        )
        jest.mocked(getQuota)
            .mockResolvedValueOnce({ used: 2, limit: 3, nextFreeAt: null })
            .mockResolvedValue({ used: 3, limit: 3, nextFreeAt: '2026-10-08T09:30:00.000Z' })
        jest.mocked(getAdmissionRefusal).mockResolvedValueOnce(null).mockResolvedValue(RequestErrorCode.QuotaExceeded)
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.QuotaExceeded))
        const { user } = renderSettings(memberAuth())

        await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1))

        await run(user)

        expect(await screen.findByText(/The next one is available on/)).toBeInTheDocument()
        expect(screen.queryByText(describeRequestError(RequestErrorCode.QuotaExceeded))).not.toBeInTheDocument()
    })

    it('doesn’t open the analysis for a visitor who left the page before the run finished', async () => {
        let finishRun!: (job: Job) => void

        jest.mocked(startAnalysis).mockReturnValueOnce(new Promise<Job>((resolve) => (finishRun = resolve)))
        const { user, unmount } = renderSettings(memberAuth())

        await run(user)
        await waitFor(() => expect(startAnalysis).toHaveBeenCalled())
        unmount()
        await act(async () => finishRun(JOB))

        expect(mockPush).not.toHaveBeenCalled()
    })

    describe('for an uploaded file', () => {
        it('declares the file, uploads it to the signed URL, then starts the analysis', async () => {
            const { user } = await renderFilePanel(memberAuth())

            await user.click(runButton())

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(createJob).toHaveBeenCalledWith({
                settings: { platforms: [], placements: [], markets: [] },
                file: { name: 'launch.mp4', contentType: VideoMimeType.Mp4, size: FILE.size },
                challengeToken: undefined,
            })
            expect(uploadToSignedUrl).toHaveBeenCalledWith(
                expect.objectContaining({ target: UPLOAD_TARGET, file: FILE }),
            )
            expect(jest.mocked(uploadToSignedUrl).mock.invocationCallOrder[0]).toBeLessThan(
                jest.mocked(startAnalysis).mock.invocationCallOrder[0],
            )
        })

        it('doesn’t start the analysis when the upload fails', async () => {
            jest.mocked(uploadToSignedUrl).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.UploadIncomplete))
            const { user } = await renderFilePanel(memberAuth())

            await user.click(runButton())

            expect(await screen.findByText(describeRequestError(RequestErrorCode.UploadIncomplete))).toBeInTheDocument()
            expect(startAnalysis).not.toHaveBeenCalled()
            expect(mockPush).not.toHaveBeenCalled()
        })
    })

    describe('with presets', () => {
        // The popover, its select and the fields' selects take seconds under a full parallel run.
        jest.setTimeout(20_000)

        beforeEach(() => jest.mocked(listPresets).mockResolvedValue([PRESET]))

        it('puts Save and Apply in the title row', async () => {
            await renderFilePanel(memberAuth())

            const titleRow = within(screen.getByRole('heading', { name: 'Where will it run?' }).parentElement!)

            expect(titleRow.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument()
            expect(titleRow.getByRole('button', { name: 'Apply a preset' })).toBeInTheDocument()
        })

        it('applies a preset to the fields, closes the popover and marks it selected', async () => {
            const { user } = await renderFilePanel(memberAuth())

            await applyLastUsedPreset(user)

            await waitFor(() => expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument())
            expect(screen.getByTitle(PLATFORM_LABELS[Platform.Meta])).toBeInTheDocument()
            expect(screen.getByTitle(MARKET_LABELS[Market.UK])).toBeInTheDocument()
            expect(getSelectedIcon(PRESET)).toBeInTheDocument()
        })

        it('applies a preset holding a value that no longer exists, without it', async () => {
            const outdated = buildPreset({
                ...PRESET,
                settings: { ...PRESET.settings, markets: [Market.UK, 'Mars' as Market] },
            })

            jest.mocked(listPresets).mockResolvedValue([outdated])
            const { user } = await renderFilePanel(memberAuth())

            await applyLastUsedPreset(user)

            await waitFor(() => expect(screen.getByTitle(MARKET_LABELS[Market.UK])).toBeInTheDocument())
            expect(screen.queryByTitle('Mars')).not.toBeInTheDocument()
        })

        it('drops the selected mark when a field changes, and brings it back when the change is undone', async () => {
            const { user } = await renderFilePanel(memberAuth())

            await applyLastUsedPreset(user)
            await waitFor(() => expect(getSelectedIcon(PRESET)).toBeInTheDocument())

            await toggleOption(user, getMarketsSelect(), MARKET_LABELS[Market.UK])

            expect(getSelectedIcon(PRESET)).not.toBeInTheDocument()

            await toggleOption(user, getMarketsSelect(), MARKET_LABELS[Market.UK])

            expect(getSelectedIcon(PRESET)).toBeInTheDocument()
        })

        it('opens Save as preset with the panel’s settings', async () => {
            const { user } = renderSettings(memberAuth(), SAMPLE_SOURCE)

            await user.click(screen.getByRole('button', { name: 'Save as preset' }))

            const dialog = within(await screen.findByRole('dialog'))

            expect(dialog.getByText('Save as preset')).toBeInTheDocument()
            SAMPLE.settings.platforms.forEach((platform) =>
                expect(dialog.getByTitle(PLATFORM_LABELS[platform])).toBeInTheDocument(),
            )
        })

        it('runs an uploaded video with the applied preset, and refreshes the presets', async () => {
            const { user } = await renderFilePanel(memberAuth())

            await applyLastUsedPreset(user)
            await run(user)

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ presetId: PRESET.id }))
            // Its usage count and last use changed.
            await waitFor(() => expect(listPresets).toHaveBeenCalledTimes(2))
        })

        it('runs a sample with the applied preset', async () => {
            const { user } = renderSettings(memberAuth(), SAMPLE_SOURCE)

            await applyLastUsedPreset(user)
            await run(user)

            await waitFor(() => expect(createSampleJob).toHaveBeenCalled())
            expect(createSampleJob).toHaveBeenCalledWith(expect.objectContaining({ presetId: PRESET.id }))
        })

        it('marks a preset saved from the panel as applied, and runs with it', async () => {
            const saved = buildPreset({ id: 'preset-3', name: 'Sample Meta', settings: SAMPLE_RUN_SETTINGS })

            jest.mocked(createPreset).mockResolvedValue(saved)
            const { user } = renderSettings(memberAuth(), SAMPLE_SOURCE)

            await user.click(screen.getByRole('button', { name: 'Save as preset' }))
            await user.type(await screen.findByLabelText('Name'), saved.name)
            jest.mocked(listPresets).mockResolvedValue([PRESET, saved])
            await user.click(screen.getByRole('button', { name: 'Save' }))

            expect(await screen.findByLabelText(`Preset: ${saved.name}`)).toBeInTheDocument()
            // The modal's form sits inside the panel's in the component tree; saving mustn't submit the panel's too.
            expect(createSampleJob).not.toHaveBeenCalled()

            await run(user)

            await waitFor(() => expect(createSampleJob).toHaveBeenCalled())
            expect(createSampleJob).toHaveBeenCalledWith(expect.objectContaining({ presetId: saved.id }))
        })

        it('only saves a preset whose settings were changed in the dialog, keeping the panel as it was', async () => {
            const settings = { ...SAMPLE_RUN_SETTINGS, markets: [...SAMPLE_RUN_SETTINGS.markets, Market.UK] }
            const saved = buildPreset({ id: 'preset-3', name: 'Sample Meta UK', settings })

            jest.mocked(createPreset).mockResolvedValue(saved)
            const { user } = renderSettings(memberAuth(), SAMPLE_SOURCE)

            await user.click(screen.getByLabelText('Save as preset'))

            const dialog = within(await screen.findByRole('dialog'))

            await user.type(dialog.getByLabelText('Name'), saved.name)
            await toggleOption(user, dialog.getAllByRole('combobox')[2], MARKET_LABELS[Market.UK])
            jest.mocked(listPresets).mockResolvedValue([PRESET, saved])
            await user.click(getSaveButtonByText())

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            expect(createPreset).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({ markets: expect.arrayContaining([Market.UK]) }),
                }),
            )
            expect(getSelectedIcon(saved)).not.toBeInTheDocument()
            expect(screen.queryByTitle(MARKET_LABELS[Market.UK])).not.toBeInTheDocument()

            await user.click(getRunButtonByText())

            await waitFor(() => expect(createSampleJob).toHaveBeenCalled())
            expect(jest.mocked(createSampleJob).mock.calls[0][0]).toMatchObject({
                settings: SAMPLE_RUN_SETTINGS,
                presetId: undefined,
            })
        })

        it('sends no preset when none was applied', async () => {
            const { user } = renderSettings(memberAuth(), SAMPLE_SOURCE)

            await run(user)

            await waitFor(() => expect(createSampleJob).toHaveBeenCalled())
            expect(jest.mocked(createSampleJob).mock.calls[0][0].presetId).toBeUndefined()
        })

        describe('the default preset', () => {
            beforeEach(() => jest.mocked(listPresets).mockResolvedValue([PRESET, DEFAULT_PRESET]))

            it('applies to an uploaded video with no settings carried over, once the presets load', async () => {
                const { user } = renderSettings(memberAuth(), FILE_SOURCE)

                expect(await screen.findByLabelText(`Preset: ${DEFAULT_PRESET.name}`)).toBeInTheDocument()
                expect(screen.getByTitle(MARKET_LABELS[Market.US])).toBeInTheDocument()

                await run(user)

                await waitFor(() => expect(createJob).toHaveBeenCalled())
                expect(createJob).toHaveBeenCalledWith(
                    expect.objectContaining({ settings: DEFAULT_PRESET.settings, presetId: DEFAULT_PRESET.id }),
                )
            })

            it('leaves the settings carried over from the previous video', async () => {
                renderSettings(memberAuth(), FILE_SOURCE, { ...NO_SETTINGS, markets: [Market.EU] })

                await waitFor(() => expect(screen.getByLabelText('Apply a preset')).toBeEnabled())

                expect(getSelectedIcon(DEFAULT_PRESET)).not.toBeInTheDocument()
                expect(screen.getByTitle(MARKET_LABELS[Market.EU])).toBeInTheDocument()
                expect(screen.queryByTitle(MARKET_LABELS[Market.US])).not.toBeInTheDocument()
            })

            it('leaves a sample its own settings', async () => {
                renderSettings(memberAuth(), SAMPLE_SOURCE)

                await waitFor(() => expect(screen.getByLabelText('Apply a preset')).toBeEnabled())

                expect(getSelectedIcon(DEFAULT_PRESET)).not.toBeInTheDocument()
                expect(screen.queryByTitle(PLATFORM_LABELS[Platform.TikTok])).not.toBeInTheDocument()
            })

            it('shows a spinner, not blank fields, until the presets load, then the default preset', async () => {
                let loadPresets!: (presets: Preset[]) => void

                jest.mocked(listPresets).mockReturnValueOnce(new Promise((resolve) => (loadPresets = resolve)))
                renderSettings(memberAuth(), FILE_SOURCE)

                expect(document.querySelector('.ant-spin')).toBeInTheDocument()
                expect(screen.queryByRole('button', { name: /run analysis/i })).not.toBeInTheDocument()

                await act(async () => loadPresets([PRESET, DEFAULT_PRESET]))

                expect(await screen.findByLabelText(`Preset: ${DEFAULT_PRESET.name}`)).toBeInTheDocument()
                expect(screen.getByTitle(MARKET_LABELS[Market.US])).toBeInTheDocument()
            })

            it('shows the fields at once without a session, since no presets can load', () => {
                renderSettings(signedOutAuth(), FILE_SOURCE)

                expect(runButton()).toBeInTheDocument()
            })

            describe('when a write starts the session, so the new session’s presets load', () => {
                beforeEach(() => {
                    jest.mocked(signIn.anonymous).mockImplementation(async () => {
                        mockUseAuth.mockReturnValue(anonymousAuth())

                        return { data: null, error: null } as never
                    })
                })

                it('keeps the form and the run’s progress during a first run', async () => {
                    jest.mocked(listPresets).mockReturnValue(new Promise(() => {}))
                    jest.mocked(createJob).mockReturnValue(new Promise(() => {}))
                    const { user, rerender } = renderSettings(signedOutAuth(), FILE_SOURCE)

                    await run(user)
                    await waitFor(() => expect(createJob).toHaveBeenCalled())
                    rerender(<Panel source={FILE_SOURCE} />)
                    await waitFor(() => expect(listPresets).toHaveBeenCalled())

                    expect(runButton()).toBeDisabled()
                })

                it('keeps Save as preset open during a first save, then marks the saved preset', async () => {
                    const saved = buildPreset({
                        id: 'preset-3',
                        name: 'First cut',
                        settings: { platforms: [], placements: [], markets: [] },
                    })
                    let loadPresets!: (presets: Preset[]) => void
                    let finishSave!: (preset: Preset) => void

                    jest.mocked(listPresets).mockReturnValue(new Promise((resolve) => (loadPresets = resolve)))
                    jest.mocked(createPreset).mockReturnValue(new Promise((resolve) => (finishSave = resolve)))
                    const { user, rerender } = renderSettings(signedOutAuth(), FILE_SOURCE)

                    await user.click(screen.getByLabelText('Save as preset'))
                    await user.type(await screen.findByLabelText('Name'), saved.name)
                    await user.click(getSaveButtonByText())
                    await waitFor(() => expect(createPreset).toHaveBeenCalled())
                    rerender(<Panel source={FILE_SOURCE} />)
                    await waitFor(() => expect(listPresets).toHaveBeenCalled())

                    expect(screen.getByLabelText('Name')).toBeInTheDocument()
                    expect(getRunButtonByText()).toBeInTheDocument()

                    await act(async () => finishSave(saved))
                    await act(async () => loadPresets([saved]))

                    expect(await screen.findByLabelText(`Preset: ${saved.name}`)).toBeInTheDocument()
                })
            })
        })
    })
})
