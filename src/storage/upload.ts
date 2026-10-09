import { ApiRequestError } from '@/api/errors'
import { RequestErrorCode, type UploadTarget } from 'adlens-shared'

interface UploadToSignedUrlInput {
    target: UploadTarget
    file: File
    onProgress?: (fraction: number) => void
}

// Cloud Storage explains a refusal in an XML body, e.g. <Code>SignatureDoesNotMatch</Code>.
const readStorageErrorCode = (body: string): string | null => /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? null

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
        // The user sees one message whatever the cause; the console keeps the cause for whoever investigates.
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve()
                return
            }

            console.error('Upload refused by storage:', xhr.status, readStorageErrorCode(xhr.responseText))
            reject(new ApiRequestError(RequestErrorCode.UploadIncomplete))
        }
        // The browser gives no reason here; DevTools' Network tab names it (net::ERR_UPLOAD_FILE_CHANGED, CORS…).
        xhr.onerror = () => {
            console.error('Upload failed before storage answered: a network error, or the file changed on disk')
            reject(new ApiRequestError(RequestErrorCode.UploadIncomplete))
        }
        xhr.send(file)
    })
