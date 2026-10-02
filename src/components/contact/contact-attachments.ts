import { ATTACHMENT_FORMATS_LABEL } from '@/labels'
import {
    CONTACT_ATTACHMENT_MAX_BYTES,
    CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES,
    CONTACT_MAX_ATTACHMENTS,
    type ContactAttachmentFile,
    contactAttachmentTypeSchema,
} from 'adlens-shared'

const toMegabytes = (bytes: number) => bytes / (1000 * 1000)

export const ATTACHMENT_ACCEPT = contactAttachmentTypeSchema.options.join(',')

export const ATTACHMENTS_HINT =
    `Up to ${CONTACT_MAX_ATTACHMENTS} images: ${ATTACHMENT_FORMATS_LABEL}, ` +
    `up to ${toMegabytes(CONTACT_ATTACHMENT_MAX_BYTES)} MB each, up to ${toMegabytes(CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES)} MB in total.`

// The API's limits, checked before anything is sent; the first problem found, in the form's words.
export const checkAttachments = (files: File[]): string | undefined => {
    if (files.length > CONTACT_MAX_ATTACHMENTS) {
        return `Attach up to ${CONTACT_MAX_ATTACHMENTS} images.`
    }

    const wrongType = files.find((file) => !contactAttachmentTypeSchema.safeParse(file.type).success)

    if (wrongType) {
        return `${wrongType.name} isn’t a ${ATTACHMENT_FORMATS_LABEL} image.`
    }

    const empty = files.find((file) => file.size === 0)

    if (empty) {
        return `${empty.name} is empty.`
    }

    const tooLarge = files.find((file) => file.size > CONTACT_ATTACHMENT_MAX_BYTES)

    if (tooLarge) {
        return `${tooLarge.name} is larger than ${toMegabytes(CONTACT_ATTACHMENT_MAX_BYTES)} MB.`
    }

    const totalBytes = files.reduce((total, file) => total + file.size, 0)

    if (totalBytes > CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES) {
        return `The images add up to more than ${toMegabytes(CONTACT_ATTACHMENTS_MAX_TOTAL_BYTES)} MB.`
    }

    return undefined
}

// Only for files checkAttachments accepted: the content type is one of the allowed image types.
export const toAttachmentFile = (file: File): ContactAttachmentFile => ({
    name: file.name,
    contentType: contactAttachmentTypeSchema.parse(file.type),
    size: file.size,
})
