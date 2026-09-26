'use client'

import { MailOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient, verifyEmail } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

type ConfirmStatus = 'ready' | 'confirmed' | 'failed'

interface IProps {
    token: string | null
}

export default function ConfirmEmail({ token }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const setView = useAuthModalStore((s) => s.setView)
    const [status, setStatus] = useState<ConfirmStatus>(token ? 'ready' : 'failed')
    const [isConfirming, setIsConfirming] = useState(false)
    const [failure, setFailure] = useState<string | null>(null)

    // Confirming waits for the button: mail scanners open every link in an email and would otherwise use the token up.
    const handleConfirm = async () => {
        if (!token) {
            return
        }

        setIsConfirming(true)

        const error = await runAuthRequest(() => verifyEmail({ query: { token } }))

        setIsConfirming(false)

        if (error) {
            setFailure(describeError(error))
            setStatus('failed')
            return
        }

        // The response set the session cookie; refresh the session so the app shows the user as signed in.
        authClient.$store.notify('$sessionSignal')
        setStatus('confirmed')
    }

    const renderBody = () => {
        if (status === 'confirmed') {
            return (
                <Result
                    status="success"
                    title="Your email is confirmed"
                    subTitle="You’re signed in and ready to check your first ad."
                    extra={
                        <Button type="primary" onClick={() => router.push('/')}>
                            Check an ad
                        </Button>
                    }
                />
            )
        }

        if (status === 'failed') {
            return (
                <Result
                    status="warning"
                    title={failure ?? 'This link is invalid or has expired'}
                    subTitle="Sign in with your email and password and we’ll send you a new confirmation link."
                    extra={
                        <Button type="primary" onClick={() => setView('signin')}>
                            Sign in
                        </Button>
                    }
                />
            )
        }

        return (
            <Result
                icon={<MailOutlined />}
                title="Confirm your email"
                subTitle="One click and your AdLens account is ready."
                extra={
                    <Button type="primary" loading={isConfirming} onClick={handleConfirm}>
                        Confirm my email
                    </Button>
                }
            />
        )
    }

    return (
        <section className={styles.page}>
            <div className={styles.card}>{renderBody()}</div>
        </section>
    )
}
