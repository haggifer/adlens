'use client'

import { Button, Spin } from 'antd'
import { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

interface IProps {
    children: ReactNode
}

// Pair with `robots: { index: false }` on the page so a private route stays uncrawlable.
export function PrivateRoute({ children }: IProps) {
    const { styles } = useStyles()
    const { isInitializing, isSignedIn } = useAuth()
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

    return <>{children}</>
}
