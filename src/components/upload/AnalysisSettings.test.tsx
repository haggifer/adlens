import { ApiRequestError } from '@/api/errors'
import { createJob, createSampleJob, startAnalysis } from '@/api/jobs'
import { getQuota } from '@/api/me'
import { authClient, signIn } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import type { UseQuotaResult } from '@/hooks/useQuota'
import { uploadToSignedUrl } from '@/storage/upload'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { buildJob, buildSample } from '@/test/fixtures'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { type Job, type Quota, RequestErrorCode, type UploadTarget, VideoMimeType } from 'adlens-shared'
import { AnalysisSettings } from './AnalysisSettings'
import { withPlatformPlacements } from './platform-placements'
import type { AnalysisSource } from './types'

const mockPush = jest.fn()
const mockChallengeToken = 'challenge-token'
const mockGetToken = jest.fn<Promise<string>, []>()
const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockUseQuota = jest.fn<UseQuotaResult, []>()
let mockQuota: Quota | undefined

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { getSession: jest.fn() },
    signIn: { anonymous: jest.fn() },
}))
jest.mock('@/api/jobs', () => ({ createJob: jest.fn(), createSampleJob: jest.fn(), startAnalysis: jest.fn() }))
jest.mock('@/api/me', () => ({ getQuota: jest.fn() }))
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

const JOB: Job = buildJob({ id: 'job-7' })

const UPLOAD_TARGET: UploadTarget = {
    url: 'https://storage.googleapis.com/bucket/video?X-Goog-Signature=abc',
    headers: { 'Content-Type': VideoMimeType.Mp4 },
}

const UNAVAILABLE_COPY = 'AdLens is briefly unavailable. Please try again.'

const CONFIRMATION_REQUIRED_COPY = 'Confirm your email to run more analyses.'

const SIGN_UP_REQUIRED_COPY = 'You’ve used your free analysis. Sign in or create an account to run more.'

const renderSettings = (auth: AuthContextValue, source: AnalysisSource = SAMPLE_SOURCE) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<AnalysisSettings source={source} />)
}

const runButton = () => screen.getByRole('button', { name: /run analysis/i })

const run = async (user: UserEvent) => {
    await user.click(runButton())
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
        jest.mocked(createSampleJob).mockResolvedValue(JOB)
        jest.mocked(createJob).mockResolvedValue({ job: JOB, upload: UPLOAD_TARGET })
        jest.mocked(startAnalysis).mockResolvedValue(JOB)
        jest.mocked(uploadToSignedUrl).mockResolvedValue(undefined)
        mockGetToken.mockResolvedValue(mockChallengeToken)
    })

    afterEach(() => jest.restoreAllMocks())

    describe('for a visitor without a session', () => {
        it('runs the check on Run, then signs in anonymously and opens the analysis', async () => {
            const queryClient = createTestQueryClient()

            // The run creates a new anonymous user, whose queries the pre-run user id wouldn't match.
            queryClient.setQueryData(['quota', 'anon-new'], { used: 0, limit: 3, nextFreeAt: null })
            mockUseAuth.mockReturnValue(signedOutAuth())
            const { user } = renderWithProviders(<AnalysisSettings source={SAMPLE_SOURCE} />, queryClient)

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

        it('uses the session it finds instead of signing in anonymously over it', async () => {
            jest.mocked(authClient.getSession).mockResolvedValueOnce({
                data: { user: { id: 'member-1' } },
                error: null,
            } as never)
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
            expect(signIn.anonymous).not.toHaveBeenCalled()
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

            expect(
                await screen.findByText('The security check didn’t pass. Try it again, then run the analysis.'),
            ).toBeInTheDocument()
            expect(authClient.getSession).not.toHaveBeenCalled()
            expect(signIn.anonymous).not.toHaveBeenCalled()
            expect(createSampleJob).not.toHaveBeenCalled()
        })

        it('explains a rate-limited anonymous sign-in and creates no job', async () => {
            jest.mocked(signIn.anonymous).mockResolvedValueOnce({ data: null, error: { status: 429 } } as never)
            const { user } = renderSettings(signedOutAuth())

            await run(user)

            expect(await screen.findByText('Too many requests. Wait a moment and try again.')).toBeInTheDocument()
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
            mockQuota = { used: 1, limit: 1, nextFreeAt: '2026-10-08T09:30:00.000Z' }
            renderSettings(unconfirmedAuth())

            expect(screen.getByText(CONFIRMATION_REQUIRED_COPY)).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Confirm email' })).toBeInTheDocument()
            expect(screen.queryByText(/The next one is available on/)).not.toBeInTheDocument()
            expect(runButton()).toBeDisabled()
        })
    })

    it('asks an anonymous visitor to sign up once their analysis is used, instead of naming a date', async () => {
        mockQuota = { used: 1, limit: 1, nextFreeAt: '2026-10-08T09:30:00.000Z' }
        const { user } = renderSettings(anonymousAuth())

        expect(screen.getByText(SIGN_UP_REQUIRED_COPY)).toBeInTheDocument()
        expect(screen.queryByText(/The next one is available on/)).not.toBeInTheDocument()
        expect(runButton()).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Sign up' }))

        expect(useAuthModalStore.getState().view).toBe('signup')
    })

    it('opens sign-up when the network’s analyses without an account are used up', async () => {
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.SignUpRequired))
        const { user } = renderSettings(anonymousAuth())

        await run(user)

        await waitFor(() => expect(useAuthModalStore.getState().view).toBe('signup'))
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
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.SignUpRequired))
        const { user } = renderSettings(anonymousAuth())

        await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1))

        await run(user)

        await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(runButton()).toBeDisabled())
        expect(screen.getAllByText(SIGN_UP_REQUIRED_COPY)).toHaveLength(1)
        expect(screen.getAllByRole('button', { name: 'Sign up' })).toHaveLength(1)
    })

    it('lets the refreshed quota say when a member’s next analysis is free, instead of a second limit message', async () => {
        mockUseQuota.mockImplementation(
            jest.requireActual<typeof import('@/hooks/useQuota')>('@/hooks/useQuota').useQuota,
        )
        jest.mocked(getQuota)
            .mockResolvedValueOnce({ used: 2, limit: 3, nextFreeAt: null })
            .mockResolvedValue({ used: 3, limit: 3, nextFreeAt: '2026-10-08T09:30:00.000Z' })
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.QuotaExceeded))
        const { user } = renderSettings(memberAuth())

        await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1))

        await run(user)

        expect(await screen.findByText(/The next one is available on/)).toBeInTheDocument()
        expect(screen.queryByText('You’ve used all your analyses for the last 7 days.')).not.toBeInTheDocument()
    })

    describe('for an uploaded file', () => {
        const FILE = new File(['video-bytes'], 'launch.mp4', { type: VideoMimeType.Mp4 })

        const FILE_SOURCE: AnalysisSource = {
            kind: 'file',
            file: FILE,
            contentType: VideoMimeType.Mp4,
            url: 'blob:launch',
        }

        it('declares the file, uploads it to the signed URL, then starts the analysis', async () => {
            const { user } = renderSettings(memberAuth(), FILE_SOURCE)

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
            const { user } = renderSettings(memberAuth(), FILE_SOURCE)

            await user.click(runButton())

            expect(await screen.findByText("The upload didn't finish. Please try again.")).toBeInTheDocument()
            expect(startAnalysis).not.toHaveBeenCalled()
            expect(mockPush).not.toHaveBeenCalled()
        })
    })
})
