'use client'

import { requestPasswordReset } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { describeError, runAuthRequest } from '@/auth/errors'
import { App, Button } from 'antd'
import { useState } from 'react'
import { useStyles } from './styles'

// Better Auth creates the password when the reset link is used; the browser has no other way to set one.
export function SetPasswordSection() {
    const { styles } = useStyles()
    const { user } = useAuth()
    const { notification } = App.useApp()
    const [isSending, setIsSending] = useState(false)

    const handleSendLink = async () => {
        const email = user?.email

        if (!email) {
            return
        }

        setIsSending(true)

        const error = await runAuthRequest(() => requestPasswordReset({ email }))

        setIsSending(false)

        if (error) {
            notification.error({ title: describeError(error), placement: 'bottomRight' })
            return
        }

        notification.success({ title: `Check your inbox at ${email}`, placement: 'bottomRight' })
    }

    return (
        <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Password</h2>
            <p className={styles.sectionText}>
                You sign in with Google or GitHub. Set a password to also sign in with your email. We’ll email you a
                link; setting the password signs you out everywhere.
            </p>
            <div>
                <Button loading={isSending} onClick={handleSendLink}>
                    Email me a link
                </Button>
            </div>
        </div>
    )
}
