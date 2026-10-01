import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { RequestErrorCode, type UploadTarget, VideoMimeType } from 'adlens-shared'
import type { ReactNode } from 'react'
import type { AuthContextValue } from '@/auth/AuthContext'
import { ApiRequestError } from '@/api/errors'
import { createJob, startAnalysis } from '@/api/jobs'
import { memberAuth } from '@/test/auth'
import { buildJob } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { AdWorkspace } from './AdWorkspace'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({ authClient: { getSession: jest.fn() }, signIn: { anonymous: jest.fn() } }))
jest.mock('@/api/jobs', () => ({ createJob: jest.fn(), createSampleJob: jest.fn(), startAnalysis: jest.fn() }))
jest.mock('@/api/samples', () => ({ listSamples: jest.fn(async () => []) }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: undefined }) }))
jest.mock('@/storage/upload', () => ({ uploadToSignedUrl: jest.fn(async () => undefined) }))
jest.mock('./HumanCheck', () => ({ HumanCheck: () => null }))
// Vidstack's custom elements don't run in jsdom; the workspace only needs the player's place in the layout.
jest.mock('@vidstack/react', () => ({
    MediaPlayer: ({ children, 'aria-label': label }: { children: ReactNode; 'aria-label': string }) => (
        <div aria-label={label}>{children}</div>
    ),
    MediaProvider: () => null,
}))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))

const JOB = buildJob({ id: 'job-7' })

const UPLOAD_TARGET: UploadTarget = { url: 'https://storage.googleapis.com/bucket/video', headers: {} }

const UNAVAILABLE_COPY = 'AdLens is briefly unavailable. Please try again.'

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

const renderWorkspace = () => {
    mockUseAuth.mockReturnValue(memberAuth())

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
})
