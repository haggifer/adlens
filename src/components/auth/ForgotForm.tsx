'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Input } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthContext'
import Field from '@/components/utils/Field'
import { useStyles } from './styles'

const forgotSchema = z.object({
    email: z.email('Enter a valid email'),
})

type ForgotValues = z.infer<typeof forgotSchema>

export default function ForgotForm() {
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
