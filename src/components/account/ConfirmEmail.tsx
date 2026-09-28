'use client'

import { App, Button, Result, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { authClient, verifyEmail } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

const INVALID_LINK = 'This link is invalid or has expired'

interface IProps {
    token: string | null
}

export function ConfirmEmail({ token }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const { notification } = App.useApp()
    const setView = useAuthModalStore((s) => s.setView)
    const [failure, setFailure] = useState<string | null>(token ? null : INVALID_LINK)
    // A token confirms once; the guard keeps React's development double-run of effects from sending it twice.
    const hasStarted = useRef(false)

    useEffect(() => {
        if (!token || hasStarted.current) {
            return
        }

        hasStarted.current = true

        const confirm = async () => {
            const error = await runAuthRequest(() => verifyEmail({ query: { token } }))

            if (error) {
                setFailure(describeError(error))
                return
            }

            // The response set the session cookie; refresh the session so the app shows the user as signed in.
            authClient.$store.notify('$sessionSignal')
            notification.success({ title: 'Your email is confirmed', placement: 'bottomRight' })
            router.replace('/')
        }

        void confirm()
    }, [token, notification, router])

    return (
        <section className={styles.page}>
            <div className={styles.card}>
                {failure ? (
                    <Result
                        status="warning"
                        title={failure}
                        subTitle="Sign in with your email and password and we’ll send you a new confirmation link."
                        extra={
                            <Button type="primary" onClick={() => setView('signin')}>
                                Sign in
                            </Button>
                        }
                    />
                ) : (
                    <Result icon={<Spin size="large" />} title="Confirming your email…" />
                )}
            </div>
        </section>
    )
}
