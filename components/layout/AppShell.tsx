'use client'

import { ReactNode } from 'react'
import AuthModal from '@/components/auth/AuthModal'
import DevBar from '@/components/dev-bar/DevBar'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import useStyles from './styles'

interface IProps {
    children: ReactNode
}

export default function AppShell({ children }: IProps) {
    const { styles } = useStyles()

    return (
        <div className={styles.harness}>
            <DevBar />
            <div className={styles.appShell}>
                <Header />
                <main className={styles.appMain}>{children}</main>
                <Footer />
                <AuthModal />
            </div>
        </div>
    )
}
