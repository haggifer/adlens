'use client'

import { MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    CONTACT_MESSAGE_MAX_LENGTH,
    type ContactMessageInput,
    contactMessageInputSchema,
    type ContactMessagePayload,
} from 'adlens-shared'
import { Alert, Button, Input, Result } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { sendContactMessage } from '@/api/contact'
import { toApiRequestError } from '@/api/errors'
import { useAuth } from '@/auth/AuthContext'
import Field from '@/components/utils/Field'

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

interface IProps {
    onDone?: () => void
}

export default function ContactForm({ onDone }: IProps) {
    const { user } = useAuth()
    const [formError, setFormError] = useState<string | null>(null)
    const [sentTo, setSentTo] = useState<string | null>(null)
    const {
        control,
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ContactMessageInput, unknown, ContactMessagePayload>({
        resolver: zodResolver(contactMessageInputSchema, { error: describeIssue }),
        defaultValues: { email: user?.email ?? '', message: '', website: '' },
    })

    const onSubmit = async (values: ContactMessagePayload) => {
        setFormError(null)

        try {
            await sendContactMessage(values)
            setSentTo(values.email)
        } catch (error) {
            setFormError(toApiRequestError(error).message)
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
        <form onSubmit={handleSubmit(onSubmit)}>
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
                            placeholder="Questions, feedback, bug reports..."
                            status={errors.message ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            {/* A honeypot: hidden from people and assistive tech, so only bots fill it in. */}
            <div className="visually-hidden" aria-hidden="true">
                <label>
                    Website
                    <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
                </label>
            </div>
            <Button type="primary" htmlType="submit" icon={<MailOutlined />} block loading={isSubmitting}>
                Send message
            </Button>
        </form>
    )
}
