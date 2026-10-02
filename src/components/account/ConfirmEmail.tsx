'use client'

import { App, Button, Result, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { verifyEmail } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, describeError, runAuthRequest } from '@/auth/errors'
import { announceSessionChange, refreshSession } from '@/auth/session'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

const INVALID_LINK = 'This link is invalid or has expired'

// The link never signs anyone in: it confirms only for a session signed in as the link's own account.
const SIGN_IN_REQUIRED_CODE = 'SIGN_IN_REQUIRED'
const EMAIL_MISMATCH_CODE = 'EMAIL_MISMATCH'

// An old or used link, which a member who has already confirmed has no use for.
const REFUSED_TOKEN_CODES = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN'])

// Keys the attempts by session, so signing in starts a new one.
const NO_ACCOUNT = 'none'

enum LinkOutcome {
    Confirming = 'confirming',
    SignInRequired = 'signInRequired',
    OtherAccount = 'otherAccount',
    Failed = 'failed',
}

interface IProps {
    token: string | null
}

export function ConfirmEmail({ token }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const { notification } = App.useApp()
    const { isInitializing, isSignedIn, isAnonymous, isEmailConfirmed, user } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsOtherAddressLink = useAuthModalStore((s) => s.setIsOtherAddressLink)
    const [outcome, setOutcome] = useState<LinkOutcome>(token ? LinkOutcome.Confirming : LinkOutcome.Failed)
    // Null when the link came without a token, so the API was never asked.
    const [linkError, setLinkError] = useState<AuthError | null>(null)
    // The session the token was last sent for. A token confirms once, so this keeps React's development double-run
    // of effects from sending it twice, and lets a sign-in after SIGN_IN_REQUIRED send it again.
    const attemptedFor = useRef<string | null>(null)

    const hasAccount = isSignedIn && !isAnonymous
    const isUnconfirmed = hasAccount && !isEmailConfirmed
    const sessionKey = hasAccount && user ? user.id : NO_ACCOUNT
    const failure = linkError ? describeError(linkError) : INVALID_LINK

    const openOwnConfirmation = () => {
        setView('confirm')
        setIsOtherAddressLink(true)
    }

    useEffect(() => {
        if (!token || isInitializing) {
            return
        }

        const isFirstAttempt = attemptedFor.current === null
        const isRetry = outcome === LinkOutcome.SignInRequired && hasAccount && attemptedFor.current !== sessionKey

        if (!isFirstAttempt && !isRetry) {
            return
        }

        attemptedFor.current = sessionKey

        const confirm = async () => {
            const error = await runAuthRequest(() => verifyEmail({ query: { token } }))

            if (!error) {
                // AuthProvider refreshes the quota, whose limit rises with the confirmation, in every tab.
                refreshSession()
                announceSessionChange()
                notification.success({ title: 'Your email is confirmed', placement: 'bottomRight' })
                router.replace('/')
                return
            }

            // Asked of a signed-in account (a retry included), it can't be met by signing in, so it ends as a failure.
            if (error.code === SIGN_IN_REQUIRED_CODE && !hasAccount) {
                setOutcome(LinkOutcome.SignInRequired)
                setView('signin')
                return
            }

            if (error.code === EMAIL_MISMATCH_CODE) {
                setLinkError(error)
                setOutcome(LinkOutcome.OtherAccount)

                if (isUnconfirmed) {
                    setView('confirm')
                    setIsOtherAddressLink(true)
                }

                return
            }

            setLinkError(error)
            setOutcome(LinkOutcome.Failed)
        }

        void confirm()
    }, [
        token,
        isInitializing,
        outcome,
        hasAccount,
        isUnconfirmed,
        sessionKey,
        notification,
        router,
        setView,
        setIsOtherAddressLink,
    ])

    const renderFailure = () => {
        if (isEmailConfirmed && REFUSED_TOKEN_CODES.has(linkError?.code ?? '')) {
            return (
                <Result
                    status="success"
                    title="Your email is already confirmed"
                    extra={
                        <Button type="primary" onClick={() => router.replace('/')}>
                            Go to the home page
                        </Button>
                    }
                />
            )
        }

        if (isUnconfirmed) {
            return (
                <Result
                    status="warning"
                    title={failure}
                    subTitle="We can send you a new confirmation link."
                    extra={
                        <Button type="primary" onClick={() => setView('confirm')}>
                            Confirm email
                        </Button>
                    }
                />
            )
        }

        if (hasAccount) {
            return <Result status="warning" title={failure} />
        }

        return (
            <Result
                status="warning"
                title={failure}
                subTitle="Sign in, then use Confirm email to get a new link."
                extra={
                    <Button type="primary" onClick={() => setView('signin')}>
                        Sign in
                    </Button>
                }
            />
        )
    }

    const renderResult = () => {
        // Once the user has signed in, the token is sent again and the spinner below shows instead.
        if (outcome === LinkOutcome.SignInRequired && !hasAccount) {
            return (
                <Result
                    status="info"
                    title={describeError({ code: SIGN_IN_REQUIRED_CODE })}
                    extra={
                        <Button type="primary" onClick={() => setView('signin')}>
                            Sign in
                        </Button>
                    }
                />
            )
        }

        if (outcome === LinkOutcome.OtherAccount) {
            return (
                <Result
                    status="warning"
                    title={failure}
                    extra={
                        isUnconfirmed ? (
                            <Button type="primary" onClick={openOwnConfirmation}>
                                Check your inbox
                            </Button>
                        ) : undefined
                    }
                />
            )
        }

        if (outcome === LinkOutcome.Failed) {
            return renderFailure()
        }

        return <Result icon={<Spin size="large" />} title="Confirming your email…" />
    }

    return (
        <section className={styles.page}>
            <div className={styles.card}>{renderResult()}</div>
        </section>
    )
}
