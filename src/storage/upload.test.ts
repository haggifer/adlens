import { RequestErrorCode } from 'adlens-shared'
import { ApiRequestError } from '@/api/errors'
import { uploadToSignedUrl } from '@/storage/upload'

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
}

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
        const file = new File(['abcd'], 'ad.mp4', { type: 'video/mp4' })
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

    it('rejects with UPLOAD_INCOMPLETE when storage refuses the upload', async () => {
        const upload = uploadToSignedUrl({ target: TARGET, file: new File(['abcd'], 'ad.mp4') })

        FakeXhr.last.respond(403)

        await expect(upload).rejects.toEqual(new ApiRequestError(RequestErrorCode.UploadIncomplete))
    })
})
