'use client'

import { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Input, Modal } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { signIn, signUp } from '@/auth/authClient'
import { AuthView, useAuth } from '@/auth/AuthContext'
import { useStyles } from './styles'

const TITLES: Record<AuthView, string> = {
    signin: 'Sign In',
    signup: 'Create your account',
    forgot: 'Reset your password',
}

const SUBTITLES: Record<AuthView, string> = {
    signin: '',
    signup: 'Start diagnosing your video ads in minutes.',
    forgot: 'Enter your email and we’ll send you a reset link.',
}

const signInSchema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Enter your password'),
})

const signUpSchema = z
    .object({
        email: z.email('Enter a valid email'),
        password: z.string().min(8, 'At least 8 characters'),
        confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    })

const forgotSchema = z.object({
    email: z.email('Enter a valid email'),
})

type SignInValues = z.infer<typeof signInSchema>
type SignUpValues = z.infer<typeof signUpSchema>
type ForgotValues = z.infer<typeof forgotSchema>

const describeError = (error: { message?: string } | null): string =>
    error?.message || 'Something went wrong. Please try again.'

interface FieldProps {
    label: string
    error?: string
    children: ReactNode
}

const Field = ({ label, error, children }: FieldProps) => {
    const { styles } = useStyles()

    return (
        <div className={styles.field}>
            <label className={styles.fieldLabel}>{label}</label>
            {children}
            {error && <p className={styles.fieldError}>{error}</p>}
        </div>
    )
}

const SignInForm = () => {
    const { styles } = useStyles()
    const { closeAuth, openAuth } = useAuth()
    const { message } = App.useApp()
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })

    const onSubmit = async (values: SignInValues) => {
        const { error } = await signIn.email(values)

        if (error) {
            message.error(describeError(error))
            return
        }

        message.success('Signed in')
        closeAuth()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
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
                <Button type="link" size="small" onClick={() => openAuth('forgot')}>
                    Forgot password?
                </Button>
            </div>
            <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
                Sign in
            </Button>
            <div className={styles.switcher}>
                <span>Don’t have an account?</span>
                <Button className={styles.switchAction} onClick={() => openAuth('signup')}>
                    Sign up
                </Button>
            </div>
        </form>
    )
}

const SignUpForm = () => {
    const { styles } = useStyles()
    const { closeAuth, openAuth } = useAuth()
    const { message } = App.useApp()
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignUpValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { email: '', password: '', confirm: '' },
    })

    const onSubmit = async (values: SignUpValues) => {
        const { error } = await signUp.email({
            email: values.email,
            password: values.password,
            name: values.email.split('@')[0],
        })

        if (error) {
            message.error(describeError(error))
            return
        }

        message.success('Account created')
        closeAuth()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
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
                <Button type="link" onClick={() => openAuth('signin')}>
                    Sign in
                </Button>
            </div>
        </form>
    )
}

const ForgotForm = () => {
    const { styles } = useStyles()
    const { openAuth } = useAuth()
    const { message } = App.useApp()
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

    const onSubmit = () => {
        message.info('Password reset isn’t available yet — email delivery is configured in a later phase.')
        openAuth('signin')
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
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
            <Button type="primary" htmlType="submit" size="large" block>
                Send reset link
            </Button>
            <div className={styles.switcher}>
                <Button type="link" onClick={() => openAuth('signin')}>
                    Back to sign in
                </Button>
            </div>
        </form>
    )
}

export default function AuthModal() {
    const { styles } = useStyles()
    const { view, closeAuth } = useAuth()

    const renderBody = () => {
        if (view === 'signup') {
            return <SignUpForm />
        }

        if (view === 'forgot') {
            return <ForgotForm />
        }

        return <SignInForm />
    }

    return (
        <Modal
            open={view !== null}
            onCancel={closeAuth}
            footer={null}
            width={420}
            centered
            destroyOnHidden
            title={
                view ? (
                    <div className={styles.head}>
                        <span className={styles.title}>{TITLES[view]}</span>
                        {SUBTITLES[view] && <span className={styles.subtitle}>{SUBTITLES[view]}</span>}
                    </div>
                ) : null
            }
        >
            {view ? renderBody() : null}
        </Modal>
    )
}
