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

    respond(status: number) {
        this.status = status
        this.onload?.()
    }

    failNetwork() {
        this.onerror?.()
    }
}

const FILE_BYTES = 'abcd'

const TARGET = {
    url: 'https://storage.googleapis.com/bucket/video?X-Goog-Signature=abc',
    headers: { 'Content-Type': 'video/mp4', 'x-goog-content-length-range': '4,4' },
}

describe('uploadToSignedUrl', () => {
    const originalXhr = window.XMLHttpRequest

    beforeEach(() => {
        window.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest
    })

    afterEach(() => {
        window.XMLHttpRequest = originalXhr
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

    it.each([199, 300, 403])('rejects with UPLOAD_INCOMPLETE when storage answers %i', async (status) => {
        const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4') })

        FakeXhr.last.respond(status)

        await expect(upload).rejects.toEqual(new ApiRequestError(RequestErrorCode.UploadIncomplete))
    })

    it('accepts any 2xx answer', async () => {
        const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4') })

        FakeXhr.last.respond(299)

        await expect(upload).resolves.toBeUndefined()
    })

    it('rejects with UPLOAD_INCOMPLETE when the connection drops', async () => {
        const upload = uploadToSignedUrl({ target: TARGET, file: new File([FILE_BYTES], 'ad.mp4') })

        FakeXhr.last.failNetwork()

        await expect(upload).rejects.toEqual(new ApiRequestError(RequestErrorCode.UploadIncomplete))
    })
})
