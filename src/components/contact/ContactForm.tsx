'use client'

import { createContactUploads, sendContactMessage } from '@/api/contact'
import { ApiRequestError, describeContactError } from '@/api/errors'
import { useAuth } from '@/auth/AuthContext'
import { HumanCheck, type HumanCheckHandle } from '@/components/human-check/HumanCheck'
import { Field } from '@/components/utils/Field'
import { uploadToSignedUrl } from '@/storage/upload'
import { MailOutlined, PaperClipOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    CONTACT_MESSAGE_MAX_LENGTH,
    type ContactMessageInput,
    contactMessageInputSchema,
    type ContactMessagePayload,
    RequestErrorCode,
} from 'adlens-shared'
import { Alert, Button, Image, Input, Result, Upload, type UploadFile } from 'antd'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { ATTACHMENT_ACCEPT, ATTACHMENTS_HINT, checkAttachments, toAttachmentFile } from './contact-attachments'

// The rules come from the shared schema; only the wording is the form's own.
const describeIssue: z.core.$ZodErrorMap = (issue) => {
    const field = issue.path?.[0]

    if (field === 'email') {
        return 'Enter a valid email'
    }

    if (field === 'message') {
        return issue.code === 'too_big'
            ? `Keep it under ${CONTACT_MESSAGE_MAX_LENGTH} characters`
            : 'Write at least 10 characters'
    }

    return undefined
}

// The images are uploaded only when the message is sent, to a draft the API creates for that message.
const keepForSending = () => false

const getFiles = (attachments: UploadFile[]): File[] =>
    attachments.flatMap((attachment) => (attachment.originFileObj ? [attachment.originFileObj] : []))

interface IProps {
    onDone?: () => void
}

export function ContactForm({ onDone }: IProps) {
    const { user } = useAuth()

    const [formError, setFormError] = useState<string | null>(null)
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [attachments, setAttachments] = useState<UploadFile[]>([])
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const humanCheck = useRef<HumanCheckHandle>(null)
    const {
        control,
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ContactMessageInput, unknown, ContactMessagePayload>({
        resolver: zodResolver(contactMessageInputSchema, { error: describeIssue }),
        defaultValues: { email: user?.email ?? '', message: '', website: '' },
    })

    const files = getFiles(attachments)
    const attachmentsError = checkAttachments(files)

    const getChallengeToken = async (): Promise<string> => {
        if (!humanCheck.current) {
            throw new ApiRequestError(RequestErrorCode.ChallengeFailed)
        }

        return humanCheck.current.getToken()
    }

    const sendMessage = async (values: ContactMessagePayload): Promise<void> => {
        const challengeToken = await getChallengeToken()

        if (!files.length) {
            await sendContactMessage({ ...values, challengeToken })
            return
        }

        // The send spends the draft even when it fails, so every attempt starts from a new check, draft and uploads.
        const { draftId, uploads } = await createContactUploads({ files: files.map(toAttachmentFile), challengeToken })

        await Promise.all(uploads.map((target, index) => uploadToSignedUrl({ target, file: files[index] })))
        await sendContactMessage({ ...values, draftId })
    }

    // Shown in the page: without it, antd links the thumbnail to its data: URL in a new tab, which Chrome refuses to
    // open (and on Android has crashed).
    const handlePreview = (attachment: UploadFile) => {
        if (attachment.originFileObj) {
            setPreviewUrl(URL.createObjectURL(attachment.originFileObj))
        }
    }

    const handlePreviewOpenChange = (isOpen: boolean) => {
        if (!isOpen && previewUrl) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
        }
    }

    const onSubmit = async (values: ContactMessagePayload) => {
        setFormError(null)

        try {
            await sendMessage(values)
            setSentTo(values.email)
        } catch (error) {
            setFormError(describeContactError(error))
        }
    }

    if (sentTo) {
        return (
            <Result
                status="success"
                title="Message sent"
                subTitle={`Thanks for writing. We'll reply to ${sentTo}.`}
                extra={onDone && <Button onClick={onDone}>Close</Button>}
            />
        )
    }

    return (
        // Wrapped so handleSubmit runs on submit: React's ref lint can't tell that it calls onSubmit, which reads the
        // human check's ref, only from the event, not during render.
        <form onSubmit={(event) => handleSubmit(onSubmit)(event)}>
            {formError && <Alert className="mb-3" type="error" showIcon title={formError} />}
            <Field label="Your email" htmlFor="contact-email" error={errors.email?.message}>
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            id="contact-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            disabled={isSubmitting}
                            status={errors.email ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Field label="Message" htmlFor="contact-message" error={errors.message?.message}>
                <Controller
                    name="message"
                    control={control}
                    render={({ field }) => (
                        <Input.TextArea
                            {...field}
                            id="contact-message"
                            rows={6}
                            maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                            showCount
                            className="mb-2"
                            placeholder="Questions, feedback, bug reports..."
                            disabled={isSubmitting}
                            status={errors.message ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Field
                label="Screenshots (optional)"
                htmlFor="contact-attachments"
                hint={ATTACHMENTS_HINT}
                error={attachmentsError}
            >
                <Upload
                    id="contact-attachments"
                    accept={ATTACHMENT_ACCEPT}
                    multiple
                    listType="picture"
                    fileList={attachments}
                    beforeUpload={keepForSending}
                    onChange={({ fileList }) => setAttachments(fileList)}
                    onPreview={handlePreview}
                    disabled={isSubmitting}
                >
                    <Button icon={<PaperClipOutlined />} disabled={isSubmitting}>
                        Attach screenshots
                    </Button>
                </Upload>
                {previewUrl && (
                    <Image
                        className="d-none"
                        src={previewUrl}
                        alt="Attached screenshot"
                        preview={{ open: true, src: previewUrl, onOpenChange: handlePreviewOpenChange }}
                    />
                )}
            </Field>
            {/* A honeypot: hidden from people and assistive tech, so only bots fill it in. */}
            <div className="visually-hidden" aria-hidden="true">
                <label>
                    Website
                    <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
                </label>
            </div>
            <HumanCheck ref={humanCheck} action="send your message" />
            <Button
                type="primary"
                htmlType="submit"
                icon={<MailOutlined />}
                block
                loading={isSubmitting}
                disabled={Boolean(attachmentsError)}
            >
                Send message
            </Button>
        </form>
    )
}
