'use client'

import { AuthModal } from '@/components/auth/AuthModal'
import { AmbientBackground } from '@/components/background/AmbientBackground'
import { ContactModal } from '@/components/contact/ContactModal'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { useNavigationStore } from '@/contexts/stores/navigationStore'
import { useSignInErrorNotice } from '@/hooks/useSignInErrorNotice'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect } from 'react'
import { useStyles } from './styles'

interface IProps {
    children: ReactNode
}

export function AppShell({ children }: IProps) {
    const { styles } = useStyles()
    const pathname = usePathname()
    const trackPath = useNavigationStore((s) => s.trackPath)

    useSignInErrorNotice()

    useEffect(() => {
        trackPath(pathname)
    }, [pathname, trackPath])

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
