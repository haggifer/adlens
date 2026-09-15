'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Input } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { signIn } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import Field from '@/components/utils/Field'
import { describeError } from './describeError'
import { useStyles } from './styles'

const signInSchema = z.object({
    email: z.email('Enter a valid email'),
    password: z.string().min(1, 'Enter your password'),
})

type SignInValues = z.infer<typeof signInSchema>

export default function SignInForm() {
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
