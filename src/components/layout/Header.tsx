'use client'

import { Divider } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'
import Logo from '@/components/brand/Logo'
import AccountMenu from '@/components/layout/AccountMenu'
import ThemeSwitch from '@/components/layout/ThemeSwitch'
import { useStyles } from './styles'

const NAV_LINKS = [
    { href: '/', label: 'Analyze' },
    { href: '/history', label: 'History' },
]

export default function Header() {
    const { styles } = useStyles()
    const pathname = usePathname()
    const { isSignedIn } = useAuth()

    return (
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.logoLink} aria-label="AdLens home">
                        <Logo />
                    </Link>
                    {isSignedIn && (
                        <nav className={styles.nav}>
                            {NAV_LINKS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={styles.navLink}
                                    data-active={pathname === item.href}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>
                <div className={styles.headerRight}>
                    <AccountMenu />
                    <Divider orientation="vertical" className={styles.headerDivider} />
                    <ThemeSwitch />
                </div>
            </div>
        </header>
    )
}
