'use client'

import { revokeOtherSessions } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { describeError, runAuthRequest } from '@/auth/errors'
import { useLinkedAccounts } from '@/hooks/useLinkedAccounts'
import { SOCIAL_PROVIDER_LABELS } from '@/labels'
import { Alert, App, Button, Skeleton } from 'antd'
import { useState } from 'react'
import { ChangePasswordForm } from './ChangePasswordForm'
import { DeleteAccountForm } from './DeleteAccountForm'
import { SetPasswordSection } from './SetPasswordSection'
import { useStyles } from './styles'

const PASSWORD_PROVIDER = 'credential'

const METHOD_LABELS: Record<string, string> = { [PASSWORD_PROVIDER]: 'Email and password', ...SOCIAL_PROVIDER_LABELS }

const formatMethods = (providers: string[]) =>
    providers.map((provider) => METHOD_LABELS[provider] ?? provider).join(', ')

// Text rows per section placeholder, roughly matching the sign-in methods, password, sessions and deletion cards.
const SECTION_SKELETONS = [1, 5, 2, 3].map((rows) => ({ rows }))

const USER_LINE_SKELETON = { rows: 1, width: '60%' }

export function AccountSettings() {
    const { styles } = useStyles()
    const { notification } = App.useApp()
    const { user } = useAuth()

    const [isRevoking, setIsRevoking] = useState(false)

    const { providers, error: providersError } = useLinkedAccounts()

    const hasPassword = Boolean(providers?.includes(PASSWORD_PROVIDER))

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

    // The sections depend on the sign-in methods, so they appear together rather than one by one as they load.
    if (!user || (!providers && !providersError)) {
        return (
            <section className="d-flex justify-content-center">
                <div className={styles.column}>
                    <div className="d-flex flex-column gap-1">
                        <h1 className={styles.pageTitle}>Account</h1>
                        <Skeleton active title={false} paragraph={USER_LINE_SKELETON} />
                    </div>
                    {SECTION_SKELETONS.map((paragraph, index) => (
                        <div key={index} className={styles.section}>
                            <Skeleton active paragraph={paragraph} />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    return (
        <section className="d-flex justify-content-center">
            <div className={styles.column}>
                <div className="d-flex flex-column gap-1">
                    <h1 className={styles.pageTitle}>Account</h1>
                    <p className={styles.sectionText}>
                        {user.name} · {user.email}
                    </p>
                </div>
                {providersError && <Alert type="error" showIcon title={describeError(providersError)} />}
                {providers && (
                    <>
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>Sign-in methods</h2>
                            <p className={styles.sectionText}>{formatMethods(providers)}</p>
                        </div>
                        {hasPassword ? <ChangePasswordForm /> : <SetPasswordSection />}
                    </>
                )}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Other devices</h2>
                    <p className={styles.sectionText}>
                        Signed in somewhere you no longer use? Sign out everywhere except here.
                    </p>
                    <div>
                        <Button loading={isRevoking} onClick={handleRevokeOtherSessions}>
                            Sign out other devices
                        </Button>
                    </div>
                </div>
                {providers && <DeleteAccountForm hasPassword={hasPassword} />}
            </div>
        </section>
    )
}
