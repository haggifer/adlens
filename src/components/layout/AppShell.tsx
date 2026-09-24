'use client'

import { ReactNode } from 'react'
import AuthModal from '@/components/auth/AuthModal'
import AmbientBackground from '@/components/background/AmbientBackground'
import ContactModal from '@/components/contact/ContactModal'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import { useStyles } from './styles'

interface IProps {
    children: ReactNode
}

export default function AppShell({ children }: IProps) {
    const { styles } = useStyles()

    return (
        <>
            <AmbientBackground />
            <div className={styles.appShell}>
                <Header />
                <main className={styles.appMain}>{children}</main>
                <Footer />
                <AuthModal />
                <ContactModal />
            </div>
        </>
    )
}
