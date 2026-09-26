'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Input } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { EMAIL_VERIFIED_URL, signIn } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import Field from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

const signInSchema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Enter your password'),
})

type SignInValues = z.infer<typeof signInSchema>

export default function SignInForm() {
    const { styles } = useStyles()
    const setView = useAuthModalStore((s) => s.setView)
    const { notification } = App.useApp()
    const [formError, setFormError] = useState<string | null>(null)
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })

    const onSubmit = async (values: SignInValues) => {
        setFormError(null)

        const error = await runAuthRequest(() => signIn.email({ ...values, callbackURL: EMAIL_VERIFIED_URL }))

        if (error) {
            setFormError(describeError(error))
            return
        }

        notification.success({ title: 'Signed in', placement: 'bottomRight' })
        setView(null)
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
            <Field label="Password" error={errors.password?.message}>
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <Input.Password
                            {...field}
                            size="large"
                            placeholder="Your password"
                            autoComplete="current-password"
                            status={errors.password ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <div className={styles.forgot}>
                <Button type="link" onClick={() => setView('forgot')}>
                    Forgot password?
                </Button>
            </div>
            <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
                Sign in
            </Button>
            <div className={styles.switcher}>
                <span>Don’t have an account?</span>
                <Button className={styles.switchAction} onClick={() => setView('signup')}>
                    Sign up
                </Button>
            </div>
        </form>
    )
}
