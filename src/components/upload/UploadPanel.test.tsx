import { readFileSnapshot } from '@/storage/file-snapshot'
import { renderWithProviders } from '@/test/render'
import { act, fireEvent, screen } from '@testing-library/react'
import { MAX_UPLOAD_BYTES } from 'adlens-shared'
import { useState } from 'react'
import { UploadPanel } from './UploadPanel'

// Vidstack's custom elements don't run in jsdom, and the empty state renders no player.
jest.mock('@vidstack/react', () => ({ MediaPlayer: () => null, MediaProvider: () => null }))
jest.mock('@vidstack/react/player/layouts/default', () => ({ DefaultVideoLayout: () => null, defaultLayoutIcons: {} }))
jest.mock('@/storage/file-snapshot', () => ({ readFileSnapshot: jest.fn() }))

const mockReadFileSnapshot = jest.mocked(readFileSnapshot)

const METADATA = { duration: 20, videoWidth: 1080, videoHeight: 1920 }

// jsdom loads no media: the metadata check's throwaway <video> reports METADATA as soon as it gets a source.
const fakeVideoElement = () => {
    const video = { ...METADATA, preload: '', onloadedmetadata: null as (() => void) | null, onerror: null }

    Object.defineProperty(video, 'src', { set: () => queueMicrotask(() => video.onloadedmetadata?.()) })

    return video
}

// Holds the reading flag the way the workspace does.
const Panel = ({
    onSelect = jest.fn(),
    onBrowseSamples = jest.fn(),
    isDisabled = false,
}: {
    onSelect?: jest.Mock
    onBrowseSamples?: jest.Mock
    isDisabled?: boolean
}) => {
    const [isReading, setIsReading] = useState(false)

    return (
        <UploadPanel
            video={null}
            onSelect={onSelect}
            onClear={jest.fn()}
            onBrowseSamples={onBrowseSamples}
            isDisabled={isDisabled}
            isReading={isReading}
            onReadingChange={setIsReading}
        />
    )
}

const getFileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!

const renderPanel = () => {
    const onSelect = jest.fn()
    const view = renderWithProviders(<Panel onSelect={onSelect} />)

    return { ...view, onSelect, input: getFileInput() }
}

const deferred = <T,>() => {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((onResolve) => {
        resolve = onResolve
    })

    return { promise, resolve }
}

describe('UploadPanel', () => {
    const createElement = document.createElement.bind(document)

    beforeEach(() => {
        mockReadFileSnapshot.mockReset()
        URL.createObjectURL = jest.fn(() => 'blob:video')
        URL.revokeObjectURL = jest.fn()
        jest.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) =>
            tag === 'video' ? (fakeVideoElement() as unknown as HTMLVideoElement) : createElement(tag, options),
        )
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('offers no way to pick a video while disabled', () => {
        renderWithProviders(<Panel isDisabled />)

        expect(screen.getByText('Try a sample ad').closest('button')).toBeDisabled()
        expect(document.querySelector('input[type="file"]')).toBeDisabled()
    })

    // On Android a just-downloaded video can change after the pick, and Chrome then refuses to read or upload it.
    it('selects a copy of the picked video, so later changes to the file can’t break the upload', async () => {
        const picked = new File(['picked'], 'ad.mp4', { type: 'video/mp4' })
        const snapshot = new File(['picked'], 'ad.mp4', { type: 'video/mp4' })
        mockReadFileSnapshot.mockResolvedValue(snapshot)
        const { user, onSelect, input } = renderPanel()

        await user.upload(input, picked)

        expect(mockReadFileSnapshot).toHaveBeenCalledWith(picked)
        expect(onSelect).toHaveBeenCalledWith(snapshot, {
            durationS: 20,
            width: 1080,
            height: 1920,
            contentType: 'video/mp4',
        })
    })

    it('asks to choose the video again when it can no longer be read', async () => {
        mockReadFileSnapshot.mockRejectedValue(new DOMException('The file could not be read', 'NotReadableError'))
        const { user, onSelect, input } = renderPanel()

        await user.upload(input, new File(['picked'], 'ad.mp4', { type: 'video/mp4' }))

        expect(await screen.findByText('We couldn’t read this video. Please choose it again.')).toBeInTheDocument()
        expect(onSelect).not.toHaveBeenCalled()
    })

    it('turns down a video that is too large without copying it into memory', async () => {
        const tooLarge = new File(['x'], 'ad.mp4', { type: 'video/mp4' })
        Object.defineProperty(tooLarge, 'size', { value: MAX_UPLOAD_BYTES + 1 })
        const { user, onSelect, input } = renderPanel()

        await user.upload(input, tooLarge)

        expect(await screen.findByText(/Video must be under/)).toBeInTheDocument()
        expect(mockReadFileSnapshot).not.toHaveBeenCalled()
        expect(onSelect).not.toHaveBeenCalled()
    })

    it('says the video is being read and takes no other pick until it is', async () => {
        const snapshot = deferred<File>()
        const picked = new File(['picked'], 'ad.mp4', { type: 'video/mp4' })
        mockReadFileSnapshot.mockReturnValueOnce(snapshot.promise)
        const { user, onSelect, input } = renderPanel()

        await user.upload(input, picked)

        expect(screen.getByRole('status')).toHaveTextContent('Reading your video…')
        expect(getFileInput()).toBeDisabled()
        expect(screen.getByText('Try a sample ad').closest('button')).toBeDisabled()

        await act(async () => snapshot.resolve(picked))

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(screen.queryByText('Reading your video…')).not.toBeInTheDocument()
        expect(getFileInput()).toBeEnabled()
    })

    it('drops a pick that finishes once a run has disabled the panel', async () => {
        const snapshot = deferred<File>()
        const picked = new File(['picked'], 'ad.mp4', { type: 'video/mp4' })
        const onSelect = jest.fn()
        mockReadFileSnapshot.mockReturnValueOnce(snapshot.promise)
        const { user, rerender } = renderWithProviders(<Panel onSelect={onSelect} />)

        await user.upload(getFileInput(), picked)
        rerender(<Panel onSelect={onSelect} isDisabled />)
        await act(async () => snapshot.resolve(picked))

        expect(onSelect).not.toHaveBeenCalled()
    })

    describe('when a read never finishes', () => {
        const READ_TIMEOUT_MS = 30_000

        const pick = () => {
            const view = renderPanel()

            fireEvent.change(view.input, { target: { files: [new File(['picked'], 'ad.mp4', { type: 'video/mp4' })] } })

            return view
        }

        // user-event waits on timers of its own, which fake timers would stall.
        beforeEach(() => jest.useFakeTimers())

        afterEach(() => jest.useRealTimers())

        it('gives up a copy that never finishes, says so and unlocks the panel', async () => {
            mockReadFileSnapshot.mockReturnValue(new Promise<File>(() => {}))
            const { onSelect } = pick()

            expect(await screen.findByRole('status')).toHaveTextContent('Reading your video…')

            await act(async () => jest.advanceTimersByTime(READ_TIMEOUT_MS))

            expect(await screen.findByText('We couldn’t read this video. Please choose it again.')).toBeInTheDocument()
            expect(screen.queryByText('Reading your video…')).not.toBeInTheDocument()
            expect(getFileInput()).toBeEnabled()
            expect(onSelect).not.toHaveBeenCalled()
        })

        it('gives up a video whose metadata never loads, says so and unlocks the panel', async () => {
            const picked = new File(['picked'], 'ad.mp4', { type: 'video/mp4' })

            mockReadFileSnapshot.mockResolvedValue(picked)
            jest.mocked(document.createElement).mockImplementation((tag: string, options?: ElementCreationOptions) =>
                tag === 'video' ? ({} as HTMLVideoElement) : createElement(tag, options),
            )
            const { onSelect } = pick()

            expect(await screen.findByRole('status')).toHaveTextContent('Reading your video…')

            await act(async () => jest.advanceTimersByTime(READ_TIMEOUT_MS))

            expect(
                await screen.findByText('Could not read the video. Please try a different file.'),
            ).toBeInTheDocument()
            expect(screen.queryByText('Reading your video…')).not.toBeInTheDocument()
            expect(getFileInput()).toBeEnabled()
            expect(URL.revokeObjectURL).toHaveBeenCalled()
            expect(onSelect).not.toHaveBeenCalled()
        })
    })

    describe('in the empty drop zone', () => {
        const renderEmpty = () => {
            const onBrowseSamples = jest.fn()
            const openFileDialog = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
            const view = renderWithProviders(<Panel onBrowseSamples={onBrowseSamples} />)

            return { ...view, onBrowseSamples, openFileDialog }
        }

        it('opens the file dialog from its text and divider too', async () => {
            const { user, openFileDialog } = renderEmpty()

            await user.click(screen.getByText('No ad at hand?'))
            await user.click(screen.getByText('or'))

            expect(openFileDialog).toHaveBeenCalledTimes(2)
        })

        it('keeps the two buttons from opening it', async () => {
            const { user, openFileDialog, onBrowseSamples } = renderEmpty()

            await user.click(screen.getByRole('button', { name: /^Requirements:/ }))
            await user.click(screen.getByText('Try a sample ad').closest('button')!)

            expect(onBrowseSamples).toHaveBeenCalledTimes(1)
            expect(openFileDialog).not.toHaveBeenCalled()
        })
    })
})
