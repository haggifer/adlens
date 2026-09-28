'use client'

import { MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Input, Result } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { signUp } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { NEW_PASSWORD_HINT, newPasswordFieldsSchema } from '@/auth/schemas'
import { Field } from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

const signUpSchema = z
    .object({
        name: z.string().trim().min(1, 'Enter your name').max(100),
        email: z.email('Enter a valid email'),
    })
    .and(newPasswordFieldsSchema)

type SignUpValues = z.infer<typeof signUpSchema>

export function SignUpForm() {
    const { styles } = useStyles()
    const setView = useAuthModalStore((s) => s.setView)
    const [formError, setFormError] = useState<string | null>(null)
    const [sentTo, setSentTo] = useState<string | null>(null)
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignUpValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: '', email: '', password: '', confirm: '' },
    })

    const onSubmit = async ({ name, email, password }: SignUpValues) => {
        setFormError(null)

        const error = await runAuthRequest(() => signUp.email({ name, email, password }))

        if (error) {
            setFormError(describeError(error))
            return
        }

        setSentTo(email)
    }

    if (sentTo) {
        return (
            <Result
                icon={<MailOutlined />}
                title="Check your inbox"
                subTitle={`We sent a confirmation link to ${sentTo}. Open it to activate your account.`}
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
            <Field label="Name" error={errors.name?.message}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            size="large"
                            placeholder="Your name"
                            autoComplete="name"
                            status={errors.name ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
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
            <Field label="Password" hint={NEW_PASSWORD_HINT} error={errors.password?.message}>
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <Input.Password
                            {...field}
                            size="large"
                            placeholder="Create a password"
                            autoComplete="new-password"
                            status={errors.password ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Field label="Confirm password" error={errors.confirm?.message}>
                <Controller
                    name="confirm"
                    control={control}
                    render={({ field }) => (
                        <Input.Password
                            {...field}
                            size="large"
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            status={errors.confirm ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
                Create account
            </Button>
            <div className={styles.switcher}>
                <span>Already have an account?</span>
                <Button className={styles.switchAction} onClick={() => setView('signin')}>
                    Sign in
                </Button>
            </div>
        </form>
    )
}
