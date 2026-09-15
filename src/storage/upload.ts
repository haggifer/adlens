interface UploadToSignedUrlInput {
    url: string
    file: File
    onProgress?: (fraction: number) => void
}

// Direct-to-GCS upload via a V4 signed PUT URL issued by the API. The Content-Type must match what the
// server signed. The server verifies the actual bytes afterwards.
export const uploadToSignedUrl = ({ url, file, onProgress }: UploadToSignedUrlInput): Promise<void> =>
    new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress?.(e.loaded / e.total)
            }
        }
        xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
    })
