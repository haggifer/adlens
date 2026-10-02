'use client'

import { signUp } from '@/auth/authClient'
import { type AuthError, describeError, isEmailInUse, runAuthRequest } from '@/auth/errors'
import { NEW_PASSWORD_HINT, newPasswordFieldsSchema } from '@/auth/schemas'
import { isSignedInDespite } from '@/auth/session'
import { Field } from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Input } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { SocialButtons } from './SocialButtons'
import { useStyles } from './styles'

const signUpSchema = z
    .object({
        name: z.string().trim().min(1, 'Enter your name').max(100),
        email: z.email('Enter a valid email'),
    })
    .and(newPasswordFieldsSchema)

type SignUpValues = z.infer<typeof signUpSchema>

const NAME_INPUT_ID = 'signup-name'
const EMAIL_INPUT_ID = 'signup-email'
const PASSWORD_INPUT_ID = 'signup-password'
const CONFIRM_PASSWORD_INPUT_ID = 'signup-confirm'

export function SignUpForm() {
    const { styles } = useStyles()
    const setView = useAuthModalStore((s) => s.setView)
    const { notification } = App.useApp()

    const [formError, setFormError] = useState<AuthError | null>(null)
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
            const isSignedIn = await isSignedInDespite(error)

            if (!isSignedIn) {
                setFormError(error)
                return
            }

            // The account was still created and signed in, so the confirmation dialog follows; it can resend the email.
            notification.error({ title: describeError(error), placement: 'bottomRight' })
        }

        // Sign-up signs the new account in (moving any anonymous history to it); only confirming the email is left.
        setView('confirm')
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {formError && (
                <Alert
                    className="mb-3"
                    type="error"
                    showIcon
                    title={describeError(formError)}
                    action={
                        isEmailInUse(formError) ? (
                            <Button size="small" onClick={() => setView('signin')}>
                                Sign in
                            </Button>
                        ) : undefined
                    }
                />
            )}
            <Field label="Name" htmlFor={NAME_INPUT_ID} error={errors.name?.message}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            id={NAME_INPUT_ID}
                            size="large"
                            placeholder="Your name"
                            autoComplete="name"
                            status={errors.name ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Field label="Email" htmlFor={EMAIL_INPUT_ID} error={errors.email?.message}>
                <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            id={EMAIL_INPUT_ID}
                            size="large"
                            placeholder="you@company.com"
                            autoComplete="email"
                            status={errors.email ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Field
                label="Password"
                htmlFor={PASSWORD_INPUT_ID}
                hint={NEW_PASSWORD_HINT}
                error={errors.password?.message}
            >
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <Input.Password
                            {...field}
                            id={PASSWORD_INPUT_ID}
                            size="large"
                            placeholder="Create a password"
                            autoComplete="new-password"
                            status={errors.password ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <Field label="Confirm password" htmlFor={CONFIRM_PASSWORD_INPUT_ID} error={errors.confirm?.message}>
                <Controller
                    name="confirm"
                    control={control}
                    render={({ field }) => (
                        <Input.Password
                            {...field}
                            id={CONFIRM_PASSWORD_INPUT_ID}
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
            <SocialButtons />
        </form>
    )
}
