'use client'

import { AccountKind } from '@/auth/types'
import { Logo } from '@/components/brand/Logo'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { formatQuotaLeft, getQuotaResetDate } from '@/components/layout/quota-label'
import { ThemeSwitch } from '@/components/layout/ThemeSwitch'
import { useQuota } from '@/hooks/useQuota'
import { useShownAccountKind } from '@/hooks/useShownAccountKind'
import { Divider, Tooltip, type TooltipProps } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStyles } from './styles'

// Focus too, so a keyboard reaches the reset date the label's tooltip holds.
const QUOTA_TOOLTIP_TRIGGER: TooltipProps['trigger'] = ['hover', 'focus']

// History and Presets list a session's own analyses and presets; the other pages are for anyone.
const NAV_LINKS = [
    { href: '/', label: 'Analyze', isSessionOnly: false },
    { href: '/history', label: 'History', isSessionOnly: true },
    { href: '/presets', label: 'Presets', isSessionOnly: true },
    { href: '/demo', label: 'Examples', isSessionOnly: false },
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
    const navLinks = NAV_LINKS.filter((link) => isSignedIn || !link.isSessionOnly)
    const quotaResetDate = quota ? getQuotaResetDate(quota) : null

    return (
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.logoLink} aria-label="AdLens home">
                        <Logo />
                    </Link>
                    <nav className={cx(styles.nav, styles.desktopOnly)} aria-label="Main">
                        {navLinks.map((item) => (
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
                </div>
                <div className={styles.headerRight}>
                    {/* Below the lg breakpoint (992px) the account and theme controls move into the menu drawer; the
                        Sign In button stays in the bar because it is the one action a signed-out visitor needs. */}
                    {hasAccount && quota && (
                        <span className={cx(styles.headerGroup, styles.desktopOnly)}>
                            <Tooltip
                                title={quotaResetDate && `Resets at ${quotaResetDate}`}
                                trigger={QUOTA_TOOLTIP_TRIGGER}
                                placement="bottom"
                            >
                                <span className={styles.quotaLabel} tabIndex={quotaResetDate ? 0 : undefined}>
                                    {formatQuotaLeft(quota)}
                                </span>
                            </Tooltip>
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
