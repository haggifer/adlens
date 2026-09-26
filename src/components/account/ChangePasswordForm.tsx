'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { App, Button, Input } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { changePassword } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { NEW_PASSWORD_HINT, newPasswordFieldsSchema } from '@/auth/schemas'
import Field from '@/components/utils/Field'
import { useStyles } from './styles'

const changePasswordSchema = z
    .object({ currentPassword: z.string().min(1, 'Enter your current password') })
    .and(newPasswordFieldsSchema)

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

const DEFAULT_VALUES: ChangePasswordValues = { currentPassword: '', password: '', confirm: '' }

export default function ChangePasswordForm() {
    const { styles } = useStyles()
    const { notification } = App.useApp()
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: DEFAULT_VALUES })

    const onSubmit = async ({ currentPassword, password }: ChangePasswordValues) => {
        const error = await runAuthRequest(() =>
            changePassword({ currentPassword, newPassword: password, revokeOtherSessions: true }),
        )

        if (error) {
            notification.error({ title: describeError(error), placement: 'bottomRight' })
            return
        }

        reset(DEFAULT_VALUES)
        notification.success({
            title: 'Password changed',
            description: 'Other devices have been signed out.',
            placement: 'bottomRight',
        })
    }

    return (
        <form className={styles.section} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.sectionTitle}>Change password</h2>
            <div>
                <Field label="Current password" error={errors.currentPassword?.message}>
                    <Controller
                        name="currentPassword"
                        control={control}
                        render={({ field }) => (
                            <Input.Password
                                {...field}
                                autoComplete="current-password"
                                status={errors.currentPassword ? 'error' : undefined}
                            />
                        )}
                    />
                </Field>
                <Field label="New password" hint={NEW_PASSWORD_HINT} error={errors.password?.message}>
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <Input.Password
                                {...field}
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
                                autoComplete="new-password"
                                status={errors.confirm ? 'error' : undefined}
                            />
                        )}
                    />
                </Field>
            </div>
            <div>
                <Button type="primary" htmlType="submit" loading={isSubmitting}>
                    Change password
                </Button>
            </div>
        </form>
    )
}
