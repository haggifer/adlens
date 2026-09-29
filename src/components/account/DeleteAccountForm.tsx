'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Input } from 'antd'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthContext'
import { authClient, deleteUser } from '@/auth/authClient'
import { type AuthError, describeError, runAuthRequest } from '@/auth/errors'
import { Field } from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { MODAL_WIDTH } from '@/design/theme'
import { useStyles } from './styles'

// Without a password, Better Auth deletes only from a recent sign-in and answers SESSION_EXPIRED otherwise.
const SESSION_EXPIRED = 'SESSION_EXPIRED'

const PASSWORD_INPUT_ID = 'delete-account-password'

const withPasswordSchema = z.object({ password: z.string().min(1, 'Enter your password') })

const withoutPasswordSchema = z.object({ password: z.string() })

type DeleteAccountValues = z.infer<typeof withPasswordSchema>

interface IProps {
    hasPassword: boolean
}

export function DeleteAccountForm({ hasPassword }: IProps) {
    const { styles, cx } = useStyles()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { signOut } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const { modal, notification } = App.useApp()
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<DeleteAccountValues>({
        resolver: zodResolver(hasPassword ? withPasswordSchema : withoutPasswordSchema),
        defaultValues: { password: '' },
    })

    const askToSignInAgain = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error(error)
            notification.error({ title: describeError(error as AuthError), placement: 'bottomRight' })
            return
        }

        notification.info({
            title: 'For your security, sign in again to delete your account.',
            placement: 'bottomRight',
        })
        setView('signin')
    }

    const deleteAccount = async ({ password }: DeleteAccountValues) => {
        const error = await runAuthRequest(() => deleteUser(hasPassword ? { password } : {}))

        if (error?.code === SESSION_EXPIRED && !hasPassword) {
            await askToSignInAgain()
            return
        }

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
            okText: 'Delete my account',
            okButtonProps: { danger: true },
            onOk: () => deleteAccount(values),
        })
    }

    return (
        <form className={cx(styles.section, styles.dangerSection)} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.sectionTitle}>Delete account</h2>
            <p className={styles.sectionText}>
                Deletes your account, every analysis and every uploaded video.
                {hasPassword && ' Enter your password to confirm.'}
            </p>
            {hasPassword && (
                <Field label="Password" htmlFor={PASSWORD_INPUT_ID} error={errors.password?.message}>
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <Input.Password
                                {...field}
                                id={PASSWORD_INPUT_ID}
                                autoComplete="current-password"
                                status={errors.password ? 'error' : undefined}
                            />
                        )}
                    />
                </Field>
            )}
            <div>
                <Button danger htmlType="submit">
                    Delete account
                </Button>
            </div>
        </form>
    )
}
