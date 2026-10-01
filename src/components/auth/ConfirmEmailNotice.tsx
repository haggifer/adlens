'use client'

import { MailOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { Alert, App, Button, Result } from 'antd'
import { useAuth } from '@/auth/AuthContext'
import { sendVerificationEmail } from '@/auth/authClient'
import { type AuthError, describeError, runAuthRequest } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'

const resendConfirmation = async (email: string): Promise<void> => {
    const error = await runAuthRequest(() => sendVerificationEmail({ email }))

    if (error) {
        throw error
    }
}

// "Check your inbox" for a signed-in account whose email isn't confirmed yet.
export function ConfirmEmailNotice() {
    const { user } = useAuth()
    const isOtherAddressLink = useAuthModalStore((s) => s.isOtherAddressLink)
    const { notification } = App.useApp()
    const resend = useMutation<void, AuthError, string>({
        mutationFn: resendConfirmation,
        onSuccess: () => notification.success({ title: 'We sent you a new link', placement: 'bottomRight' }),
    })
    // Right after sign-up the session may still be loading the new account.
    const email = user?.email ?? null

    return (
        <div className="d-flex flex-column gap-3">
            {isOtherAddressLink && (
                <Alert type="info" showIcon title="The link you opened is for a different address." />
            )}
            <Result
                icon={<MailOutlined />}
                title="Check your inbox"
                subTitle={`We sent a confirmation link to ${email ?? 'your email'}. Open it to confirm your email and run more analyses.`}
                extra={
                    <Button
                        type="primary"
                        loading={resend.isPending}
                        disabled={!email}
                        onClick={() => email && resend.mutate(email)}
                    >
                        Resend email
                    </Button>
                }
            />
            {resend.error && <Alert type="error" showIcon title={describeError(resend.error)} />}
        </div>
    )
}
