'use client'

import { App, Button } from 'antd'
import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { revokeOtherSessions } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import ChangePasswordForm from './ChangePasswordForm'
import DeleteAccountForm from './DeleteAccountForm'
import { useStyles } from './styles'

export default function AccountSettings() {
    const { styles } = useStyles()
    const { user } = useAuth()
    const { notification } = App.useApp()
    const [isRevoking, setIsRevoking] = useState(false)

    const handleRevokeOtherSessions = async () => {
        setIsRevoking(true)

        const error = await runAuthRequest(() => revokeOtherSessions())

        setIsRevoking(false)

        if (error) {
            notification.error({ message: describeError(error), placement: 'bottomRight' })
            return
        }

        notification.success({ message: 'Signed out of all other devices', placement: 'bottomRight' })
    }

    return (
        <section className="d-flex justify-content-center">
            <div className={styles.column}>
                <div className="d-flex flex-column gap-1">
                    <h1 className={styles.pageTitle}>Account</h1>
                    <p className={styles.sectionText}>
                        {user?.name} · {user?.email}
                    </p>
                </div>
                <ChangePasswordForm />
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Sessions</h2>
                    <p className={styles.sectionText}>
                        Signed in somewhere you no longer use? End every session except this one.
                    </p>
                    <div>
                        <Button loading={isRevoking} onClick={handleRevokeOtherSessions}>
                            Sign out other devices
                        </Button>
                    </div>
                </div>
                <DeleteAccountForm />
            </div>
        </section>
    )
}
