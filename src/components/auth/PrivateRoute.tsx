'use client'

import { useAuth } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { Button, Spin } from 'antd'
import { ReactNode } from 'react'
import { useStyles } from './styles'

interface IProps {
    children: ReactNode
    // A page that manages the account itself, which an anonymous session doesn't have and an account whose email
    // isn't confirmed can't use yet.
    isAccountOnly?: boolean
}

// Pair with `robots: { index: false }` on the page so a private route stays uncrawlable.
export function PrivateRoute({ children, isAccountOnly }: IProps) {
    const { styles } = useStyles()
    const { isInitializing, isSignedIn, isAnonymous, isEmailConfirmed } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)

    if (isInitializing) {
        return (
            <div className={styles.gate}>
                <Spin size="large" />
                <p className={styles.gateText}>Checking your session…</p>
            </div>
        )
    }

    if (!isSignedIn) {
        return (
            <div className={styles.gate}>
                <h2 className={styles.gateTitle}>
                    Sign in
                    <br className={styles.phoneBreak} /> to access this page
                </h2>
                <Button type="primary" size="large" onClick={() => setView('signin')}>
                    Sign In
                </Button>
            </div>
        )
    }

    if (isAccountOnly && isAnonymous) {
        return (
            <div className={styles.gate}>
                <h2 className={styles.gateTitle}>
                    Sign up
                    <br className={styles.phoneBreak} /> to manage your account
                </h2>
                <Button type="primary" size="large" onClick={() => setView('signup')}>
                    Sign Up
                </Button>
                <Button size="large" onClick={() => setView('signin')}>
                    Sign In
                </Button>
            </div>
        )
    }

    if (isAccountOnly && !isEmailConfirmed) {
        return (
            <div className={styles.gate}>
                <h2 className={styles.gateTitle}>
                    Confirm your email
                    <br className={styles.phoneBreak} /> to manage your account
                </h2>
                <Button type="primary" size="large" onClick={() => setView('confirm')}>
                    Confirm email
                </Button>
            </div>
        )
    }

    return <>{children}</>
}
