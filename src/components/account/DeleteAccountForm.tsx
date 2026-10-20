'use client'

import { deleteUser } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, describeError, runAuthRequest } from '@/auth/errors'
import { refreshSession } from '@/auth/session'
import { Field } from '@/components/utils/Field'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Input } from 'antd'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useStyles } from './styles'

// Without a password, Better Auth deletes only from a recent sign-in and answers SESSION_EXPIRED otherwise.
const SESSION_EXPIRED = 'SESSION_EXPIRED'

const PASSWORD_INPUT_ID = 'delete-account-password'

const withPasswordSchema = z.object({ password: z.string().min(1, 'Enter your password') })

const withoutPasswordSchema = z.object({ password: z.string() })

type DeleteAccountValues = z.infer<typeof withPasswordSchema>

interface IProps {
    hasPassword: boolean
    onClose: () => void
}

// The deletion modal's content (DeleteAccountSection): submitting it is the confirmation, so nothing asks again.
export function DeleteAccountForm({ hasPassword, onClose }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { signOut } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const { notification } = App.useApp()

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<DeleteAccountValues>({
        resolver: zodResolver(hasPassword ? withPasswordSchema : withoutPasswordSchema),
        defaultValues: { password: '' },
    })

    // The sign-in modal takes over, so this one closes whatever happens next.
    const askToSignInAgain = async () => {
        onClose()

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

    // A failure keeps the modal open, so a mistyped password can be corrected.
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
        refreshSession()
        queryClient.clear()
        notification.success({ title: 'Your account has been deleted', placement: 'bottomRight' })
        onClose()
        router.push('/')
    }

    return (
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit(deleteAccount)}>
            <p className={styles.sectionText}>
                Deletes your account, every analysis and every uploaded video, permanently. This can’t be undone.
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
            <div className="d-flex justify-content-end gap-2 mt-2">
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" danger htmlType="submit" loading={isSubmitting}>
                    Delete
                </Button>
            </div>
        </form>
    )
}
