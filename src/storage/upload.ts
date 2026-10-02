import { ApiRequestError } from '@/api/errors'
import { RequestErrorCode, type UploadTarget } from 'adlens-shared'

interface UploadToSignedUrlInput {
    target: UploadTarget
    file: File
    onProgress?: (fraction: number) => void
}

// Direct-to-GCS upload through the API's V4 signed URL. The signed headers (content type, exact size) must be sent as
// given, or GCS rejects the upload. XHR rather than fetch, for upload progress events.
export const uploadToSignedUrl = ({ target, file, onProgress }: UploadToSignedUrlInput): Promise<void> =>
    new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.open('PUT', target.url)

        for (const [name, value] of Object.entries(target.headers)) {
            xhr.setRequestHeader(name, value)
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress?.(event.loaded / event.total)
            }
        }
        xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new ApiRequestError(RequestErrorCode.UploadIncomplete))
        xhr.onerror = () => reject(new ApiRequestError(RequestErrorCode.UploadIncomplete))
        xhr.send(file)
    })
