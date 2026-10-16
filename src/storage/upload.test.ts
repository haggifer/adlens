import { ApiRequestError } from '@/api/errors'
import { uploadToSignedUrl } from '@/storage/upload'
import { RequestErrorCode } from 'adlens-shared'

class FakeXhr {
    static last: FakeXhr

    method = ''
    url = ''
    headers: Record<string, string> = {}
    body: unknown = null
    status = 0
    responseText = ''
    upload: { onprogress: ((event: Partial<ProgressEvent>) => void) | null } = { onprogress: null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    constructor() {
        FakeXhr.last = this
    }

    open(method: string, url: string) {
        this.method = method
        this.url = url
    }

    setRequestHeader(name: string, value: string) {
        this.headers[name] = value
    }

    send(body: unknown) {
        this.body = body
    }

    respond(status: number, responseText = '') {
        this.status = status
        this.responseText = responseText
        this.onload?.()
    }

    failNetwork() {
        this.onerror?.()
    }
}

const FILE_BYTES = 'abcd'

const STORAGE_REFUSAL = '<?xml version="1.0"?><Error><Code>SignatureDoesNotMatch</Code></Error>'

const TARGET = {
    url: 'https://storage.googleapis.com/bucket/video?X-Goog-Signature=abc',
    headers: { 'Content-Type': 'video/mp4', 'x-goog-content-length-range': '4,4' },
}

describe('uploadToSignedUrl', () => {
    const originalXhr = window.XMLHttpRequest
    let consoleError: jest.SpyInstance

    beforeEach(() => {
        window.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        window.XMLHttpRequest = originalXhr
        consoleError.mockRestore()
    })

    it('PUTs the file with exactly the signed headers and reports progress', async () => {
        const file = new File([FILE_BYTES], 'ad.mp4', { type: 'video/mp4' })
        const onProgress = jest.fn()
        const upload = uploadToSignedUrl({ target: TARGET, file, onProgress })
        const xhr = FakeXhr.last

        xhr.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 4 })
        xhr.respond(200)
        await upload

        expect(xhr.method).toBe('PUT')
        expect(xhr.url).toBe(TARGET.url)
        expect(xhr.headers).toEqual(TARGET.headers)
        expect(xhr.body).toBe(file)
        expect(onProgress).toHaveBeenCalledWith(0.5)
    })

    it('skips progress events that carry no total', async () => {
        const onProgress = jest.fn()
        const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4'), onProgress })

        FakeXhr.last.upload.onprogress?.({ lengthComputable: false, loaded: 2, total: 0 })
        FakeXhr.last.respond(200)
        await upload

        expect(onProgress).not.toHaveBeenCalled()
    })

    it.each([199, 300, 403])(
        'rejects with UPLOAD_INCOMPLETE when storage answers %i, logging the status and Cloud Storage’s error code',
        async (status) => {
            const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4') })

            FakeXhr.last.respond(status, STORAGE_REFUSAL)

            await expect(upload).rejects.toEqual(new ApiRequestError(RequestErrorCode.UploadIncomplete))
            expect(consoleError).toHaveBeenCalledWith('Upload refused by storage:', status, 'SignatureDoesNotMatch')
        },
    )

    it('accepts any 2xx answer', async () => {
        const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4') })

        FakeXhr.last.respond(299)

        await expect(upload).resolves.toBeUndefined()
    })

    it('rejects with UPLOAD_INCOMPLETE when the connection drops, logging that storage never answered', async () => {
        const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4') })

        FakeXhr.last.failNetwork()

        await expect(upload).rejects.toEqual(new ApiRequestError(RequestErrorCode.UploadIncomplete))
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Upload failed before storage answered'))
    })
})
