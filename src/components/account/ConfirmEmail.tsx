'use client'

import { App, Button, Result, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { authClient, verifyEmail } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, describeError, runAuthRequest } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

const INVALID_LINK = 'This link is invalid or has expired'
const ACCOUNT_LINK_FAILED_STATUS = 403
const NEEDS_SIGN_IN_MESSAGE =
    'Your email is confirmed. Sign in to continue. Analyses you ran before signing up weren’t moved to this account.'
const STILL_SIGNED_IN_MESSAGE = 'We couldn’t sign you out of this account. Sign out from the menu before continuing.'
const SIGN_OUT_ATTEMPTS = 2

// signOut already rejects on any failure (network or refused). One retry gives a blip a second chance, but the
// token's user must never be left looking signed in, so the sign-in prompt still follows even if both attempts
// fail — the caller then also reports the last error instead of silently pretending it worked.
const signOutBeforeSignIn = async (signOut: () => Promise<void>): Promise<AuthError | null> => {
    let lastError: AuthError | null = null

    for (let attempt = 1; attempt <= SIGN_OUT_ATTEMPTS; attempt += 1) {
        try {
            await signOut()
            return null
        } catch (error) {
            console.error(error)
            lastError = error as AuthError
        }
    }

    return lastError
}

interface IProps {
    token: string | null
}

export function ConfirmEmail({ token }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const { notification } = App.useApp()
    const { signOut } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const [failure, setFailure] = useState<string | null>(token ? null : INVALID_LINK)
    // Better Auth signs the browser into the confirmed account before this outcome fires (its autoSignIn runs
    // before the after-hook), even though the anonymous history it was supposed to carry over never moved.
    const [needsSignIn, setNeedsSignIn] = useState(false)
    // Both sign-out attempts failed, so the browser is still signed into the token's account (Better Auth
    // autoSignIn) rather than genuinely needing to sign back in.
    const [hasSignOutFailed, setHasSignOutFailed] = useState(false)
    // A token confirms once; the guard keeps React's development double-run of effects from sending it twice.
    const hasStarted = useRef(false)

    useEffect(() => {
        if (!token || hasStarted.current) {
            return
        }

        hasStarted.current = true

        const confirm = async () => {
            const error = await runAuthRequest(() => verifyEmail({ query: { token } }))

            if (error?.status === ACCOUNT_LINK_FAILED_STATUS && error.code === 'ACCOUNT_LINK_FAILED') {
                const signOutError = await signOutBeforeSignIn(signOut)

                if (signOutError) {
                    notification.error({ title: describeError(signOutError), placement: 'bottomRight' })
                    // The account is still signed in as far as Better Auth's client is concerned; let the header
                    // reflect that instead of the sign-in prompt implying it doesn't know who's signed in.
                    authClient.$store.notify('$sessionSignal')
                    setHasSignOutFailed(true)
                }

                setNeedsSignIn(true)
                return
            }

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
    }, [token, notification, router, signOut])

    const renderResult = () => {
        if (needsSignIn && hasSignOutFailed) {
            return <Result status="warning" title="Your email is confirmed." subTitle={STILL_SIGNED_IN_MESSAGE} />
        }

        if (needsSignIn) {
            return (
                <Result
                    status="info"
                    title={NEEDS_SIGN_IN_MESSAGE}
                    extra={
                        <Button type="primary" onClick={() => setView('signin')}>
                            Sign in
                        </Button>
                    }
                />
            )
        }

        if (failure) {
            return (
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
            )
        }

        return <Result icon={<Spin size="large" />} title="Confirming your email…" />
    }

    return (
        <section className={styles.page}>
            <div className={styles.card}>{renderResult()}</div>
        </section>
    )
}
