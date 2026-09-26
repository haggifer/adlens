'use client'

import { MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Input, Result } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { requestPasswordReset } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import Field from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

const forgotSchema = z.object({
    email: z.email('Enter a valid email'),
})

type ForgotValues = z.infer<typeof forgotSchema>

export default function ForgotForm() {
    const { styles } = useStyles()
    const setView = useAuthModalStore((s) => s.setView)
    const [formError, setFormError] = useState<string | null>(null)
    const [isSent, setIsSent] = useState(false)
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

    const onSubmit = async ({ email }: ForgotValues) => {
        setFormError(null)

        const error = await runAuthRequest(() => requestPasswordReset({ email }))

        if (error) {
            setFormError(describeError(error))
            return
        }

        setIsSent(true)
    }

    // The same message whether or not the address has an account, so the form can't be used to probe for users.
    if (isSent) {
        return (
            <Result
                icon={<MailOutlined />}
                title="Check your inbox"
                subTitle="If an account exists for that email, we’ve sent a link to reset the password. It expires in 1 hour."
                extra={
                    <Button type="primary" onClick={() => setView('signin')}>
                        Back to sign in
                    </Button>
                }
            />
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {formError && <Alert className="mb-3" type="error" showIcon title={formError} />}
            <Field label="Email" error={errors.email?.message}>
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            size="large"
                            placeholder="you@company.com"
                            autoComplete="email"
                            status={errors.email ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
                Send reset link
            </Button>
            <div className={styles.switcher}>
                <Button type="link" onClick={() => setView('signin')}>
                    Back to sign in
                </Button>
            </div>
        </form>
    )
}
