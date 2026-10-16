import { toMegabytes } from '@/file-size'
import { ATTACHMENT_FORMATS_LABEL } from '@/labels'
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
        expect(checkAttachments(files)).toContain(String(CONTACT_MAX_ATTACHMENTS))
    })

    it('names a file that isn’t a supported image, and the formats that are', () => {
        const gifRefusal = checkAttachments([buildImage('a.png'), buildImage('clip.gif', 1000, 'image/gif')])

        expect(gifRefusal).toContain('clip.gif')
        expect(gifRefusal).toContain(ATTACHMENT_FORMATS_LABEL)
        expect(gifRefusal).not.toContain('a.png')
        expect(checkAttachments([buildImage('notes', 1000, '')])).toContain('notes')
    })

    it('names an empty file', () => {
        expect(checkAttachments([buildImage('blank.png', 0)])).toContain('blank.png')
    })

    it('names an image over the size limit', () => {
        const refusal = checkAttachments([buildImage('huge.png', CONTACT_ATTACHMENT_MAX_BYTES + 1)])

        expect(refusal).toContain('huge.png')
        expect(refusal).toContain(`${toMegabytes(CONTACT_ATTACHMENT_MAX_BYTES)} MB`)
    })

    it('limits the images’ total size', () => {
        const size = CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES / 4

        expect(checkAttachments(['a', 'b', 'c', 'd'].map((name) => buildImage(`${name}.png`, size)))).toBeUndefined()
        expect(checkAttachments(['a', 'b', 'c', 'd'].map((name) => buildImage(`${name}.png`, size + 1)))).toContain(
            `${toMegabytes(CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES)} MB`,
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
