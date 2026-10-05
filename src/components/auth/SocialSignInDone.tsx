'use client'

import { describeError } from '@/auth/errors'
import { announceSessionChange } from '@/auth/session'
import { postSocialSignInOutcome } from '@/auth/social-sign-in'
import { useStyles } from '@/components/status/styles'
import { Button, Result, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'

// A window that closes itself is gone well before this; one still open was opened directly, or the browser (some on
// phones) refused to close it.
const CLOSE_WAIT_MS = 500

interface IProps {
    errorCode: string | null
}

// The social sign-in popup lands here: report the outcome to the tab that opened it, then close.
export function SocialSignInDone({ errorCode }: IProps) {
    const { styles } = useStyles()

    const [isStillOpen, setIsStillOpen] = useState(false)
    // Keeps React's development double-run of the effect from reporting twice, which would notify the opener twice.
    const hasReported = useRef(false)

    const renderResult = () => {
        if (!isStillOpen) {
            return <Result icon={<Spin size="large" />} title="Finishing sign-in…" />
        }

        return (
            <Result
                status={errorCode ? 'warning' : 'success'}
                title={errorCode ? describeError({ code: errorCode }) : 'You’re signed in. You can close this tab.'}
                extra={
                    <Button type="primary" href="/">
                        Go to the home page
                    </Button>
                }
            />
        )
    }

    useEffect(() => {
        if (!hasReported.current) {
            hasReported.current = true
            postSocialSignInOutcome({ errorCode })

            if (!errorCode) {
                announceSessionChange()
            }

            window.close()
        }

        const timer = window.setTimeout(() => setIsStillOpen(true), CLOSE_WAIT_MS)

        return () => window.clearTimeout(timer)
    }, [errorCode])

    return (
        <section className={styles.page}>
            <div className={styles.card}>{renderResult()}</div>
        </section>
    )
}
