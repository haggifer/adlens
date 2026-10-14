import { ApiRequestError, describeRequestError } from '@/api/errors'
import { createJob, getAdmissionRefusal, startAnalysis } from '@/api/jobs'
import { listPresets } from '@/api/presets'
import { listSamples } from '@/api/samples'
import type { AuthContextValue } from '@/auth/AuthContext'
import { MARKET_LABELS, PLATFORM_LABELS } from '@/labels'
import { readFileSnapshot } from '@/storage/file-snapshot'
import { memberAuth, unconfirmedAuth } from '@/test/auth'
import { buildJob, buildPreset, buildSample } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { Market, Placement, Platform, RequestErrorCode, type UploadTarget, VideoMimeType } from 'adlens-shared'
import type { ReactNode } from 'react'
import { AdWorkspace } from './AdWorkspace'
import { getSampleSettings } from './sample-settings'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockGetToken = jest.fn<Promise<string>, []>()

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => new URLSearchParams(window.location.search),
}))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({ authClient: { getSession: jest.fn() }, signIn: { anonymous: jest.fn() } }))
jest.mock('@/api/jobs', () => ({
    ...jest.requireActual<typeof import('@/api/jobs')>('@/api/jobs'),
    createJob: jest.fn(),
    createSampleJob: jest.fn(),
    getAdmissionRefusal: jest.fn(async () => null),
    startAnalysis: jest.fn(),
}))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn(async () => []) }))
jest.mock('@/api/samples', () => ({ listSamples: jest.fn(async () => []) }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: undefined }) }))
jest.mock('@/storage/upload', () => ({ uploadToSignedUrl: jest.fn(async () => undefined) }))
// jsdom's File can't be read into memory; the copy itself is file-snapshot's and UploadPanel's to test.
jest.mock('@/storage/file-snapshot', () => ({ readFileSnapshot: jest.fn(async (file: File) => file) }))
// Turnstile's widget can't run in jsdom; the stand-in hands out whatever mockGetToken settles with.
jest.mock('@/components/human-check/HumanCheck', () => {
    const { useImperativeHandle } = jest.requireActual<typeof import('react')>('react')

    return {
        HumanCheck: ({ ref }: { ref: unknown }) => {
            useImperativeHandle(ref as never, () => ({ getToken: () => mockGetToken() }))
            return null
        },
    }
})
// Vidstack's custom elements don't run in jsdom; the workspace only needs the player's place in the layout.
jest.mock('@vidstack/react', () => ({
    MediaPlayer: ({ children, 'aria-label': label }: { children: ReactNode; 'aria-label': string }) => (
        <div aria-label={label}>{children}</div>
    ),
    MediaProvider: () => null,
}))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))

const JOB = buildJob({ id: 'job-7' })

const PRESET = buildPreset({
    name: 'Meta UK',
    settings: { platforms: [Platform.Meta], placements: [Placement.MetaFeed], markets: [Market.UK] },
    lastUsedAt: '2026-10-10T09:00:00.000Z',
})

const UPLOAD_TARGET: UploadTarget = { url: 'https://storage.googleapis.com/bucket/video', headers: {} }

const UNAVAILABLE_COPY = describeRequestError(RequestErrorCode.Unavailable)

const buildFile = (name: string) => new File(['video-bytes'], name, { type: VideoMimeType.Mp4 })

// The upload panel reads a file's metadata through a throwaway <video>, which never loads in jsdom.
const loadMetadataOnSrc = () =>
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        configurable: true,
        set(this: HTMLMediaElement) {
            this.onloadedmetadata?.(new Event('loadedmetadata'))
        },
    })

const deferred = <T,>() => {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((onResolve, onReject) => {
        resolve = onResolve
        reject = onReject
    })

    return { promise, resolve, reject }
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement

const runButton = () => screen.getByRole('button', { name: /run analysis/i })

const removeButton = () => screen.getByRole('button', { name: 'Remove video' })

const replaceButton = () => screen.getByRole('button', { name: 'Replace video' })

const chooseFile = async (user: UserEvent, file: File) => {
    await user.upload(fileInput(), file)
    await screen.findByRole('button', { name: 'Remove video' })
}

const getCreatedUrls = () => jest.mocked(URL.createObjectURL).mock.results.map((result) => result.value as string)

const renderWorkspace = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<AdWorkspace />)
}

// Each test picks a file, runs and re-renders antd's Selects: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('AdWorkspace', () => {
    let blobCount = 0

    beforeAll(() => {
        loadMetadataOnSrc()
        URL.createObjectURL = jest.fn(() => `blob:video-${++blobCount}`)
        URL.revokeObjectURL = jest.fn()
    })

    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(startAnalysis).mockResolvedValue(JOB)
        jest.mocked(getAdmissionRefusal).mockResolvedValue(null)
        jest.mocked(listPresets).mockResolvedValue([])
    })

    it('says AdLens is unavailable and takes no video while the API can’t answer, until it can', async () => {
        jest.mocked(getAdmissionRefusal).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
        const { user } = renderWorkspace()

        expect(await screen.findByText(UNAVAILABLE_COPY)).toBeInTheDocument()
        expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()

        const answer = deferred<RequestErrorCode | null>()

        jest.mocked(getAdmissionRefusal).mockReturnValueOnce(answer.promise)
        await user.click(screen.getByRole('button', { name: 'Try again' }))

        // Asking again doesn't bring the upload back before the API has answered.
        expect(screen.getByText(UNAVAILABLE_COPY)).toBeInTheDocument()
        expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()

        await act(async () => answer.resolve(null))

        expect(await screen.findByText('Try a sample ad')).toBeInTheDocument()
        expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument()
    })

    it('shows neither the upload nor the unavailable notice while a failed first answer is asked for again', async () => {
        const retried = deferred<RequestErrorCode | null>()

        jest.mocked(getAdmissionRefusal)
            .mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.Unavailable))
            .mockReturnValueOnce(retried.promise)
        mockUseAuth.mockReturnValue(memberAuth())
        renderWithProviders(
            <AdWorkspace />,
            new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } }),
        )

        await waitFor(() => expect(getAdmissionRefusal).toHaveBeenCalledTimes(2))
        expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()
        expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument()

        await act(async () => retried.resolve(null))

        expect(await screen.findByText('Try a sample ad')).toBeInTheDocument()
    })

    it('locks the video and its settings from Run until the run fails, then unlocks them', async () => {
        const created = deferred<Awaited<ReturnType<typeof createJob>>>()

        jest.mocked(createJob).mockReturnValueOnce(created.promise)
        const { user } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))
        await user.click(runButton())

        expect(removeButton()).toBeDisabled()
        expect(replaceButton()).toBeDisabled()
        expect(fileInput()).toBeDisabled()
        expect(runButton()).toBeDisabled()
        screen.getAllByRole('combobox').forEach((select) => expect(select).toBeDisabled())

        created.reject(new ApiRequestError(RequestErrorCode.Unavailable))

        expect(await screen.findByText(UNAVAILABLE_COPY)).toBeInTheDocument()
        expect(removeButton()).toBeEnabled()
        expect(replaceButton()).toBeEnabled()
        expect(fileInput()).toBeEnabled()
        expect(runButton()).toBeEnabled()

        // Placements stay disabled until a platform is picked, as before the run.
        const [platformsSelect, , marketsSelect] = screen.getAllByRole('combobox')

        expect(platformsSelect).toBeEnabled()
        expect(marketsSelect).toBeEnabled()
    })

    it('unlocks the video when the human check fails, before any job exists', async () => {
        const check = deferred<string>()

        mockGetToken.mockReturnValueOnce(check.promise)
        const { user } = renderWorkspace(unconfirmedAuth())

        await chooseFile(user, buildFile('launch.mp4'))
        await user.click(runButton())

        expect(removeButton()).toBeDisabled()
        expect(replaceButton()).toBeDisabled()

        await act(async () => check.reject(new ApiRequestError(RequestErrorCode.ChallengeFailed)))

        expect(
            await screen.findByText('The security check didn’t pass. Try it again, then run the analysis.'),
        ).toBeInTheDocument()
        expect(removeButton()).toBeEnabled()
        expect(replaceButton()).toBeEnabled()
        expect(createJob).not.toHaveBeenCalled()
    })

    it('keeps everything locked once the run has started, until the page changes', async () => {
        jest.mocked(createJob).mockResolvedValueOnce({ job: JOB, upload: UPLOAD_TARGET })
        const { user } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))
        await user.click(runButton())

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/analyses/${JOB.id}`))
        expect(removeButton()).toBeDisabled()
        expect(replaceButton()).toBeDisabled()
    })

    it('ignores a video dropped on the player during a run', async () => {
        jest.mocked(createJob).mockReturnValueOnce(new Promise(() => {}))
        const { user } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))
        await user.click(runButton())
        const objectUrlCount = jest.mocked(URL.createObjectURL).mock.calls.length

        fireEvent.drop(removeButton().closest('[data-video]') as HTMLElement, {
            dataTransfer: { files: [buildFile('other.mp4')] },
        })
        // Long enough for an accepted drop to read the file's metadata and select it.
        await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

        expect(URL.createObjectURL).toHaveBeenCalledTimes(objectUrlCount)
        expect(removeButton()).toBeDisabled()
    })

    it('starts a newly chosen file without the previous file’s run error', async () => {
        jest.mocked(createJob).mockRejectedValueOnce(new ApiRequestError(RequestErrorCode.Unavailable))
        const { user } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))
        await user.click(runButton())
        expect(await screen.findByText(UNAVAILABLE_COPY)).toBeInTheDocument()

        await user.upload(fileInput(), buildFile('second-cut.mp4'))

        await waitFor(() => expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument())
    })

    it('keeps the settings and the applied preset for a replacement video, and runs it with that preset', async () => {
        jest.mocked(listPresets).mockResolvedValue([PRESET])
        jest.mocked(createJob).mockResolvedValue({ job: JOB, upload: UPLOAD_TARGET })
        const { user } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Apply a preset' })).toBeEnabled())
        await user.click(screen.getByRole('button', { name: 'Apply a preset' }))
        await user.click(await screen.findByRole('button', { name: 'Apply' }))
        await screen.findByRole('img', { name: `Preset: ${PRESET.name}` })

        await user.upload(fileInput(), buildFile('second-cut.mp4'))
        await waitFor(() =>
            expect(URL.createObjectURL).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'second-cut.mp4' })),
        )

        expect(await screen.findByRole('img', { name: `Preset: ${PRESET.name}` })).toBeInTheDocument()
        expect(screen.getByTitle(PLATFORM_LABELS[Platform.Meta])).toBeInTheDocument()
        expect(screen.getByTitle(MARKET_LABELS[Market.UK])).toBeInTheDocument()

        await user.click(runButton())

        await waitFor(() => expect(createJob).toHaveBeenCalled())
        expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ presetId: PRESET.id }))
    })

    // Label and text queries: once a dialog's styles have loaded, role queries resolve computed styles for seconds.
    it('gives a file that replaces a sample the sample’s settings and no preset, not those from before it', async () => {
        const sample = buildSample()
        const pickFile = async (name: string) => {
            await user.upload(fileInput(), buildFile(name))
            await screen.findByLabelText('Remove video')
        }

        jest.mocked(listPresets).mockResolvedValue([PRESET])
        jest.mocked(listSamples).mockResolvedValue([sample])
        jest.mocked(createJob).mockResolvedValue({ job: JOB, upload: UPLOAD_TARGET })
        const { user } = renderWorkspace()

        await pickFile('launch.mp4')
        await waitFor(() => expect(screen.getByLabelText('Apply a preset')).toBeEnabled())
        await user.click(screen.getByLabelText('Apply a preset'))
        await user.click((await screen.findByText('Apply')).closest('button') as HTMLElement)
        expect(await screen.findByTitle(MARKET_LABELS[Market.UK])).toBeInTheDocument()

        await user.click(screen.getByLabelText('Remove video'))
        await user.click(screen.getByText('Try a sample ad'))
        await user.click(await screen.findByText(sample.description))
        await waitFor(() => expect(screen.queryByTitle(MARKET_LABELS[Market.UK])).not.toBeInTheDocument())

        await user.click(screen.getByLabelText('Remove video'))
        await pickFile('second-cut.mp4')
        await user.click(screen.getByText('Run Analysis').closest('button') as HTMLElement)

        await waitFor(() => expect(createJob).toHaveBeenCalled())
        expect(createJob).toHaveBeenCalledWith(expect.objectContaining({ settings: getSampleSettings(sample) }))
        // The preset applied before the sample no longer describes the settings.
        expect(jest.mocked(createJob).mock.calls[0][0].presetId).toBeUndefined()
    })

    // The metadata check makes and releases URLs of its own, so each test asks that none is left unreleased.
    it('releases the picked video’s copy when the page leaves it, as after a run', async () => {
        const { user, unmount } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))

        expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(getCreatedUrls().at(-1))

        unmount()

        getCreatedUrls().forEach((url) => expect(URL.revokeObjectURL).toHaveBeenCalledWith(url))
    })

    it('keeps no copy of a pick that finishes after the page was left', async () => {
        const snapshot = deferred<File>()
        const file = buildFile('launch.mp4')

        jest.mocked(readFileSnapshot).mockReturnValueOnce(snapshot.promise)
        const { user, unmount } = renderWorkspace()

        await user.upload(fileInput(), file)
        unmount()
        await act(async () => snapshot.resolve(file))

        getCreatedUrls().forEach((url) => expect(URL.revokeObjectURL).toHaveBeenCalledWith(url))
    })

    it('reads one replacement at a time with Run disabled, and releases every replaced video', async () => {
        const replacement = deferred<File>()
        const secondFile = buildFile('second-cut.mp4')
        const { user, unmount } = renderWorkspace()

        await chooseFile(user, buildFile('launch.mp4'))
        jest.mocked(readFileSnapshot).mockReturnValueOnce(replacement.promise)
        await user.upload(fileInput(), secondFile)

        expect(screen.getByRole('status')).toHaveTextContent('Reading your video…')
        expect(runButton()).toBeDisabled()

        await user.upload(fileInput(), buildFile('third-cut.mp4'))

        expect(readFileSnapshot).toHaveBeenCalledTimes(2)

        await act(async () => replacement.resolve(secondFile))
        await waitFor(() =>
            expect(URL.createObjectURL).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'second-cut.mp4' })),
        )

        await waitFor(() => expect(runButton()).toBeEnabled())

        unmount()

        getCreatedUrls().forEach((url) => expect(URL.revokeObjectURL).toHaveBeenCalledWith(url))
    })
})
