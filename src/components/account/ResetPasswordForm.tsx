'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Input, Result } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { resetPassword } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { NEW_PASSWORD_HINT, newPasswordFieldsSchema } from '@/auth/schemas'
import Field from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

type ResetPasswordValues = z.infer<typeof newPasswordFieldsSchema>

interface IProps {
    token: string | null
}

export default function ResetPasswordForm({ token }: IProps) {
    const { styles } = useStyles()
    const setView = useAuthModalStore((s) => s.setView)
    const [formError, setFormError] = useState<string | null>(null)
    const [isDone, setIsDone] = useState(false)
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordValues>({
        resolver: zodResolver(newPasswordFieldsSchema),
        defaultValues: { password: '', confirm: '' },
    })

    const onSubmit = async ({ password }: ResetPasswordValues) => {
        if (!token) {
            return
        }

        setFormError(null)

        const error = await runAuthRequest(() => resetPassword({ newPassword: password, token }))

        if (error) {
            setFormError(describeError(error))
            return
        }

        setIsDone(true)
    }

    const renderBody = () => {
        if (!token) {
            return (
                <Result
                    status="warning"
                    title="This reset link is invalid or has expired"
                    extra={
                        <Button type="primary" onClick={() => setView('forgot')}>
                            Request a new link
                        </Button>
                    }
                />
            )
        }

        if (isDone) {
            return (
                <Result
                    status="success"
                    title="Password updated"
                    subTitle="You’ve been signed out everywhere. Sign in with your new password."
                    extra={
                        <Button type="primary" onClick={() => setView('signin')}>
                            Sign in
                        </Button>
                    }
                />
            )
        }

        return (
            <form onSubmit={handleSubmit(onSubmit)}>
                <h1 className={styles.sectionTitle}>Choose a new password</h1>
                {formError && <Alert className="mt-3" type="error" showIcon title={formError} />}
                <div className="mt-3">
                    <Field label="New password" hint={NEW_PASSWORD_HINT} error={errors.password?.message}>
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Input.Password
                                    {...field}
                                    size="large"
                                    autoComplete="new-password"
                                    status={errors.password ? 'error' : undefined}
                                />
                            )}
                        />
                    </Field>
                    <Field label="Confirm new password" error={errors.confirm?.message}>
                        <Controller
                            name="confirm"
                            control={control}
                            render={({ field }) => (
                                <Input.Password
                                    {...field}
                                    size="large"
                                    autoComplete="new-password"
                                    status={errors.confirm ? 'error' : undefined}
                                />
                            )}
                        />
                    </Field>
                </div>
                <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
                    Set new password
                </Button>
            </form>
        )
    }

    return (
        <section className={styles.page}>
            <div className={styles.card}>{renderBody()}</div>
        </section>
    )
}
