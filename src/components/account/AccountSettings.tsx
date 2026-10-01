'use client'

import { Alert, App, Button } from 'antd'
import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { revokeOtherSessions } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import { useLinkedAccounts } from '@/hooks/useLinkedAccounts'
import { SOCIAL_PROVIDER_LABELS } from '@/labels'
import { ChangePasswordForm } from './ChangePasswordForm'
import { DeleteAccountForm } from './DeleteAccountForm'
import { SetPasswordSection } from './SetPasswordSection'
import { useStyles } from './styles'

const PASSWORD_PROVIDER = 'credential'

const METHOD_LABELS: Record<string, string> = { [PASSWORD_PROVIDER]: 'Email and password', ...SOCIAL_PROVIDER_LABELS }

const formatMethods = (providers: string[]) =>
    providers.map((provider) => METHOD_LABELS[provider] ?? provider).join(', ')

export function AccountSettings() {
    const { styles } = useStyles()
    const { user } = useAuth()
    const { providers, error: providersError } = useLinkedAccounts()
    const { notification } = App.useApp()
    const [isRevoking, setIsRevoking] = useState(false)

    const handleRevokeOtherSessions = async () => {
        setIsRevoking(true)

        const error = await runAuthRequest(() => revokeOtherSessions())

        setIsRevoking(false)

        if (error) {
            notification.error({ title: describeError(error), placement: 'bottomRight' })
            return
        }

        notification.success({ title: 'Signed out of all other devices', placement: 'bottomRight' })
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
                {providersError && <Alert type="error" showIcon title={describeError(providersError)} />}
                {providers && (
                    <>
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Sign-in methods</h2>
                            <p className={styles.sectionText}>{formatMethods(providers)}</p>
                        </div>
                        {providers.includes(PASSWORD_PROVIDER) ? <ChangePasswordForm /> : <SetPasswordSection />}
                    </>
                )}
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
                {providers && <DeleteAccountForm hasPassword={providers.includes(PASSWORD_PROVIDER)} />}
            </div>
        </section>
    )
}
