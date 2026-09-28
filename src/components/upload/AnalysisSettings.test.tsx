import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Platform, RequestErrorCode, type Sample, VideoMimeType } from 'adlens-shared'
import { ApiRequestError } from '@/api/errors'
import { createSampleJob } from '@/api/jobs'
import { signIn } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { AnalysisSettings } from './AnalysisSettings'

interface MockAuth {
    user: { id: string } | null
    isAnonymous: boolean
}

let auth: MockAuth = { user: null, isAnonymous: false }

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => auth }))
jest.mock('@/auth/authClient', () => ({ signIn: { anonymous: jest.fn(async () => ({ error: null })) } }))
jest.mock('@/api/jobs', () => ({
    createJob: jest.fn(),
    createSampleJob: jest.fn(async () => ({ id: 'j1' })),
    startAnalysis: jest.fn(async () => ({ id: 'j1' })),
}))
jest.mock('@/hooks/useQuota', () => ({
    quotaKey: (userId?: string) => ['quota', userId],
    useQuota: () => ({ quota: undefined }),
}))
jest.mock('@/storage/upload', () => ({ uploadToSignedUrl: jest.fn() }))
// Turnstile's widget can't run in jsdom; a button stands in for a passed check.
jest.mock('./HumanCheck', () => ({
    HumanCheck: ({ onToken }: { onToken: (token: string | null) => void }) => {
        const { createElement } = jest.requireActual('react')

        return createElement('button', { type: 'button', onClick: () => onToken('token-1') }, 'Pass the check')
    },
}))

const SAMPLE: Sample = {
    id: 's1',
    title: 'Running shoes',
    description: 'A 15-second product spot',
    settings: { platforms: [Platform.Meta], placements: [], markets: [] },
    media: {
        durationS: 15,
        width: 1080,
        height: 1920,
        hasAudio: true,
        sizeBytes: 1000,
        contentType: VideoMimeType.Mp4,
    },
    contentType: VideoMimeType.Mp4,
    previewUrl: 'https://storage.googleapis.com/bucket/samples/s1.mp4',
}

const renderSettings = () =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AnalysisSettings source={{ kind: 'sample', sample: SAMPLE }} />
        </QueryClientProvider>,
    )

const runButton = () => screen.getByRole('button', { name: /run analysis/i })

describe('AnalysisSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: null })
        useContactModalStore.setState({ isOpen: false })
    })

    it('signs a visitor in anonymously right before the first analysis, sending the check’s token', async () => {
        auth = { user: null, isAnonymous: false }
        renderSettings()

        expect(runButton()).toBeDisabled()

        await userEvent.click(screen.getByRole('button', { name: 'Pass the check' }))
        await userEvent.click(runButton())

        await waitFor(() =>
            expect(createSampleJob).toHaveBeenCalledWith({
                sampleId: 's1',
                settings: expect.any(Object),
                challengeToken: 'token-1',
            }),
        )
        expect(jest.mocked(signIn.anonymous).mock.invocationCallOrder[0]).toBeLessThan(
            jest.mocked(createSampleJob).mock.invocationCallOrder[0],
        )
    })

    it('lets a member run without waiting for the check, and never signs them in again', async () => {
        auth = { user: { id: 'u1' }, isAnonymous: false }
        renderSettings()

        await userEvent.click(runButton())

        await waitFor(() => expect(createSampleJob).toHaveBeenCalledWith(expect.objectContaining({ sampleId: 's1' })))
        expect(signIn.anonymous).not.toHaveBeenCalled()
    })

    it('opens sign-up when the network’s analyses without an account are used up', async () => {
        auth = { user: { id: 'anon-1' }, isAnonymous: true }
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.SignUpRequired))
        renderSettings()

        await userEvent.click(screen.getByRole('button', { name: 'Pass the check' }))
        await userEvent.click(runButton())

        await waitFor(() => expect(useAuthModalStore.getState().view).toBe('signup'))
        expect(signIn.anonymous).not.toHaveBeenCalled()
    })

    it('offers the Contact form when the network hit its hard limit', async () => {
        auth = { user: { id: 'u1' }, isAnonymous: false }
        jest.mocked(createSampleJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.NetworkQuotaExceeded))
        renderSettings()

        await userEvent.click(runButton())
        await userEvent.click(await screen.findByRole('button', { name: 'Contact us' }))

        expect(useContactModalStore.getState().isOpen).toBe(true)
    })
})
