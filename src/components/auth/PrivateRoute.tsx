'use client'

import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { NotFoundState } from '@/components/status/NotFoundState'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { Button, Spin } from 'antd'
import { ReactNode } from 'react'
import { useStyles } from './styles'

interface IProps {
    children: ReactNode
    // A page that manages the account itself, which an anonymous session doesn't have and an account whose email
    // isn't confirmed can't use yet.
    isAccountOnly?: boolean
    // A page only an admin may see. Anyone else signed in gets the not-found page, as for a page that doesn't exist;
    // a signed-out visitor still gets the sign-in prompt, so an admin can sign in there.
    isAdminOnly?: boolean
}

// Pair with `robots: { index: false }` on the page so a private route stays uncrawlable.
export function PrivateRoute({ children, isAccountOnly, isAdminOnly }: IProps) {
    const { styles } = useStyles()
    const { isInitializing, isSignedIn, isAnonymous, isEmailConfirmed, accountKind } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)

    if (isInitializing) {
        return (
            <div className={styles.gate}>
                <Spin size="large" />
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

    if (isAdminOnly && accountKind !== AccountKind.Admin) {
        return <NotFoundState />
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
