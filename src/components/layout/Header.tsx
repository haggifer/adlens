'use client'

import { AccountKind } from '@/auth/types'
import { Logo } from '@/components/brand/Logo'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { describeNextFree, formatQuotaLeft } from '@/components/layout/quota-label'
import { ThemeSwitch } from '@/components/layout/ThemeSwitch'
import { AppLink } from '@/components/utils/AppLink'
import { useQuota } from '@/hooks/useQuota'
import { useRefreshAtNextFree } from '@/hooks/useRefreshAtNextFree'
import { useShownAccountKind } from '@/hooks/useShownAccountKind'
import { Divider, Tooltip, type TooltipProps } from 'antd'
import { usePathname } from 'next/navigation'
import { useStyles } from './styles'

// Focus too, so a keyboard reaches the date the label's tooltip holds.
const QUOTA_TOOLTIP_TRIGGER: TooltipProps['trigger'] = ['hover', 'focus']

// History lists a session's own analyses; every other page is for anyone, Presets included: without a session it shows
// the empty state, and creating a preset starts one.
const NAV_LINKS = [
    { href: '/', label: 'Analyze', isSessionOnly: false },
    { href: '/history', label: 'History', isSessionOnly: true },
    { href: '/presets', label: 'Presets', isSessionOnly: false },
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
    const nextFree = quota ? describeNextFree(quota) : null

    // The header is on every page, so its one timer serves the settings panel's Run as well.
    useRefreshAtNextFree(quota?.nextFreeAt)

    return (
        <header className={styles.header}>
            <div className={styles.headerInner}>
                <div className={styles.headerLeft}>
                    <AppLink href="/" className={styles.logoLink} aria-label="AdLens home">
                        <Logo />
                    </AppLink>
                    <nav className={cx(styles.nav, styles.desktopOnly)} aria-label="Main">
                        {navLinks.map((item) => (
                            <AppLink
                                key={item.href}
                                href={item.href}
                                className={styles.navLink}
                                data-active={pathname === item.href}
                                aria-current={pathname === item.href ? 'page' : undefined}
                            >
                                {item.label}
                            </AppLink>
                        ))}
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    {/* Below the lg breakpoint (992px) the account and theme controls move into the menu drawer; the
                        Sign In button stays in the bar because it is the one action a signed-out visitor needs. */}
                    {hasAccount && quota && (
                        <span className={cx(styles.headerGroup, styles.desktopOnly)}>
                            <Tooltip title={nextFree} trigger={QUOTA_TOOLTIP_TRIGGER} placement="bottom">
                                <span className={styles.quotaLabel} tabIndex={nextFree ? 0 : undefined}>
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
