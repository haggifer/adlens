import { readFileSnapshot } from '@/storage/file-snapshot'

const readText = (file: File): Promise<string> =>
    new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(file)
    })

// jsdom's File has no arrayBuffer(); the browser's does, so the test gives the picked file one.
const pickFile = (text: string, name: string, type: string): File => {
    const file = new File([text], name, { type, lastModified: 1_700_000_000_000 })

    Object.defineProperty(file, 'arrayBuffer', {
        value: () => Promise.resolve(Uint8Array.from(text, (char) => char.charCodeAt(0)).buffer),
    })

    return file
}

describe('readFileSnapshot', () => {
    it('copies the bytes, name, type and time into a separate file', async () => {
        const picked = pickFile('video bytes', 'ad.mp4', 'video/mp4')

        const snapshot = await readFileSnapshot(picked)

        expect(snapshot).not.toBe(picked)
        expect(snapshot.name).toBe('ad.mp4')
        expect(snapshot.type).toBe('video/mp4')
        expect(snapshot.size).toBe(picked.size)
        expect(snapshot.lastModified).toBe(1_700_000_000_000)
        await expect(readText(snapshot)).resolves.toBe('video bytes')
    })

    it('rejects when the picked file can no longer be read', async () => {
        const picked = new File(['x'], 'ad.mp4', { type: 'video/mp4' })

        Object.defineProperty(picked, 'arrayBuffer', {
            value: () => Promise.reject(new DOMException('The file could not be read', 'NotReadableError')),
        })

        await expect(readFileSnapshot(picked)).rejects.toThrow('The file could not be read')
    })
})
