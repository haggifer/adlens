import { ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '@/firebase/config'

interface UploadJobVideoInput {
    path: string
    file: File
    onProgress?: (fraction: number) => void
}

// Direct-to-Storage upload (the one client write kept off the API). Storage rules gate the path,
// size, and content-type; the server verifies the actual bytes afterwards.
export const uploadJobVideo = ({ path, file, onProgress }: UploadJobVideoInput): Promise<void> =>
    new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type })

        task.on(
            'state_changed',
            (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes),
            reject,
            () => resolve(),
        )
    })
