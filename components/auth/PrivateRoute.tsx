'use client'

import { ReactNode } from 'react'
import { Button, Spin } from 'antd'
import { useAuthUi } from '@/lib/auth/AuthUiContext'
import useStyles from './styles'

interface IProps {
    children: ReactNode
}

// Pair with `robots: { index: false }` on the page so a private route stays uncrawlable.
export default function PrivateRoute({ children }: IProps) {
    const { styles } = useStyles()
    const { initializing, isSignedIn, openAuth } = useAuthUi()

    if (initializing) {
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
                <h2 className={styles.gateTitle}>Sign in to access this feature</h2>
                <Button type="primary" size="large" onClick={() => openAuth('signin')}>
                    Sign In
                </Button>
            </div>
        )
    }

    return <>{children}</>
}
