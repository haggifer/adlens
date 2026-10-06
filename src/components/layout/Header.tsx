'use client'

import { AccountKind } from '@/auth/types'
import { Logo } from '@/components/brand/Logo'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { formatQuotaLeft } from '@/components/layout/quota-label'
import { ThemeSwitch } from '@/components/layout/ThemeSwitch'
import { useQuota } from '@/hooks/useQuota'
import { useShownAccountKind } from '@/hooks/useShownAccountKind'
import { Divider } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStyles } from './styles'

const NAV_LINKS = [
    { href: '/', label: 'Analyze' },
    { href: '/history', label: 'History' },
]

export function Header() {
    const { styles, cx } = useStyles()
    const pathname = usePathname()
    // While the session loads, the header takes the shape of the account this browser last had.
    const { kind } = useShownAccountKind()

    const { quota } = useQuota()

    const isSignedIn = kind !== null
    // Only an account shows its count: an anonymous session's single analysis is what the settings panel explains.
    const hasAccount = isSignedIn && kind !== AccountKind.Anonymous

    return (
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.logoLink} aria-label="AdLens home">
                        <Logo />
                    </Link>
                    {isSignedIn && (
                        <nav className={cx(styles.nav, styles.desktopOnly)} aria-label="Main">
                            {NAV_LINKS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={styles.navLink}
                                    data-active={pathname === item.href}
                                    aria-current={pathname === item.href ? 'page' : undefined}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>
                <div className={styles.headerRight}>
                    {/* Below the md breakpoint the account and theme controls move into the menu drawer; the Sign In
                        button stays in the bar because it is the one action a signed-out visitor needs. */}
                    {hasAccount && quota && (
                        <span className={cx(styles.headerGroup, styles.desktopOnly)}>
                            <span className={styles.quotaLabel}>{formatQuotaLeft(quota)}</span>
                            <Divider orientation="vertical" className={styles.headerDivider} />
                        </span>
                    )}
                    <span className={cx(styles.headerGroup, isSignedIn && styles.desktopOnly)}>
                        <AccountMenu />
                    </span>
                    <span className={cx(styles.headerGroup, styles.desktopOnly)}>
                        <Divider orientation="vertical" className={styles.headerDivider} />
                        <ThemeSwitch />
                    </span>
                    <span className={cx(styles.headerGroup, styles.mobileOnly)}>
                        <MobileMenu />
                    </span>
                </div>
            </div>
        </header>
    )
}
