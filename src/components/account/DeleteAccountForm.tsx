'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Input } from 'antd'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { authClient, deleteUser } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { Field } from '@/components/utils/Field'
import { MODAL_WIDTH } from '@/design/theme'
import { useStyles } from './styles'

const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password') })

type DeleteAccountValues = z.infer<typeof deleteAccountSchema>

export function DeleteAccountForm() {
    const { styles, cx } = useStyles()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { modal, notification } = App.useApp()
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<DeleteAccountValues>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { password: '' } })

    const deleteAccount = async ({ password }: DeleteAccountValues) => {
        const error = await runAuthRequest(() => deleteUser({ password }))

        if (error) {
            notification.error({ title: describeError(error), placement: 'bottomRight' })
            return
        }

        // The API deleted the session with the user; refresh the client's view of it and drop the old user's data.
        authClient.$store.notify('$sessionSignal')
        queryClient.clear()
        notification.success({ title: 'Your account has been deleted', placement: 'bottomRight' })
        router.push('/')
    }

    const onSubmit = (values: DeleteAccountValues) => {
        modal.confirm({
            title: 'Delete your account?',
            width: MODAL_WIDTH,
            content: 'Your analyses and uploaded videos will be deleted permanently. This can’t be undone.',
            okText: 'Delete account',
            okButtonProps: { danger: true },
            onOk: () => deleteAccount(values),
        })
    }

    return (
        <form className={cx(styles.section, styles.dangerSection)} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.sectionTitle}>Delete account</h2>
            <p className={styles.sectionText}>
                Deletes your account, every analysis and every uploaded video. Enter your password to confirm.
            </p>
            <Field label="Password" error={errors.password?.message}>
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <Input.Password
                            {...field}
                            autoComplete="current-password"
                            status={errors.password ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <div>
                <Button danger htmlType="submit">
                    Delete account
                </Button>
            </div>
        </form>
    )
}
