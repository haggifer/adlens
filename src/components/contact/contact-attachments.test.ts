import {
    CONTACT_ATTACHMENT_MAX_BYTES,
    CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES,
    CONTACT_MAX_ATTACHMENTS,
} from 'adlens-shared'
import { checkAttachments, toAttachmentFile } from './contact-attachments'

// jsdom keeps a File's real bytes, so a large size is declared rather than allocated.
const buildImage = (name: string, size = 1000, type = 'image/png') => {
    const file = new File(['x'], name, { type })

    Object.defineProperty(file, 'size', { value: size })

    return file
}

describe('checkAttachments', () => {
    it('accepts no images, and PNG, JPEG and WebP images within the limits', () => {
        expect(checkAttachments([])).toBeUndefined()
        expect(
            checkAttachments([
                buildImage('a.png'),
                buildImage('b.jpg', 1000, 'image/jpeg'),
                buildImage('c.webp', CONTACT_ATTACHMENT_MAX_BYTES, 'image/webp'),
            ]),
        ).toBeUndefined()
    })

    it('allows only so many images', () => {
        const files = Array.from({ length: CONTACT_MAX_ATTACHMENTS + 1 }, (_, index) => buildImage(`${index}.png`))

        expect(checkAttachments(files.slice(0, CONTACT_MAX_ATTACHMENTS))).toBeUndefined()
        expect(checkAttachments(files)).toBe('Attach up to 5 images.')
    })

    it('names a file that isn’t a PNG, JPEG or WebP image', () => {
        expect(checkAttachments([buildImage('a.png'), buildImage('clip.gif', 1000, 'image/gif')])).toBe(
            'clip.gif isn’t a PNG, JPEG or WebP image.',
        )
        expect(checkAttachments([buildImage('notes', 1000, '')])).toBe('notes isn’t a PNG, JPEG or WebP image.')
    })

    it('names an empty file', () => {
        expect(checkAttachments([buildImage('blank.png', 0)])).toBe('blank.png is empty.')
    })

    it('names an image over the size limit', () => {
        expect(checkAttachments([buildImage('huge.png', CONTACT_ATTACHMENT_MAX_BYTES + 1)])).toBe(
            'huge.png is larger than 8 MB.',
        )
    })

    it('limits the images’ total size', () => {
        const size = CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES / 4

        expect(checkAttachments(['a', 'b', 'c', 'd'].map((name) => buildImage(`${name}.png`, size)))).toBeUndefined()
        expect(checkAttachments(['a', 'b', 'c', 'd'].map((name) => buildImage(`${name}.png`, size + 1)))).toBe(
            'The images add up to more than 25 MB.',
        )
    })
})

describe('toAttachmentFile', () => {
    it('declares the image as the API expects it', () => {
        expect(toAttachmentFile(buildImage('shot.webp', 2048, 'image/webp'))).toEqual({
            name: 'shot.webp',
            contentType: 'image/webp',
            size: 2048,
        })
    })
})
