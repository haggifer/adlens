'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Input } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { signUp } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import Field from '@/components/utils/Field'
import { describeError } from './describeError'
import { useStyles } from './styles'

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

type SignUpValues = z.infer<typeof signUpSchema>

export default function SignUpForm() {
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
