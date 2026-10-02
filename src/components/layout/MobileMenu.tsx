'use client'

import { checkEmailConfirmed } from '@/auth/account-kind'
import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { formatQuotaLeft } from '@/components/layout/quota-label'
import { ThemeSwitch } from '@/components/layout/ThemeSwitch'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useForgetBrowser } from '@/hooks/useForgetBrowser'
import { useQuota } from '@/hooks/useQuota'
import { useShownAccountKind } from '@/hooks/useShownAccountKind'
import { useSignOut } from '@/hooks/useSignOut'
import {
    HistoryOutlined,
    LogoutOutlined,
    MailOutlined,
    MenuOutlined,
    SettingOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import { Button, Drawer } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { useStyles } from './styles'

const DRAWER_WIDTH = 300

// Who may open a link: anyone, any session (anonymous ones too), or only an account whose email is confirmed.
type LinkAccess = 'public' | 'session' | 'account'

interface MenuLink {
    href: string
    label: string
    icon: ReactNode
    access: LinkAccess
}

const MENU_LINKS: MenuLink[] = [
    { href: '/', label: 'Analyze', icon: <UploadOutlined />, access: 'public' },
    { href: '/history', label: 'History', icon: <HistoryOutlined />, access: 'session' },
    { href: '/account', label: 'Account', icon: <SettingOutlined />, access: 'account' },
]

const canOpen = (access: LinkAccess, isSignedIn: boolean, isEmailConfirmed: boolean) => {
    if (access === 'public') {
        return true
    }

    return access === 'session' ? isSignedIn : isEmailConfirmed
}

export function MobileMenu() {
    const { styles, cx } = useStyles()
    const pathname = usePathname()
    const { user } = useAuth()
    // While the session loads, the remembered kind is drawn with every session action disabled.
    const { kind, isInert } = useShownAccountKind()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()
    const forgetBrowser = useForgetBrowser()

    const [isOpen, setIsOpen] = useState(false)

    const { quota } = useQuota()

    const isSignedIn = kind !== null
    const isAnonymous = kind === AccountKind.Anonymous
    const isEmailConfirmed = checkEmailConfirmed(kind)
    // Confirmed or not: either way the user typed the address, so it may be shown.
    const hasAccount = isSignedIn && !isAnonymous

    const close = () => setIsOpen(false)

    const handleContact = () => {
        close()
        setIsContactOpen(true)
    }

    const handleSignOut = () => {
        close()
        void signOut()
    }

    const handleForgetBrowser = () => {
        close()
        void forgetBrowser()
    }

    const handleSignIn = () => {
        close()
        setView('signin')
    }

    const handleConfirmEmail = () => {
        close()
        setView('confirm')
    }

    return (
        <>
            <Button
                type="text"
                icon={<MenuOutlined />}
                className={styles.menuButton}
                aria-label="Open menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(true)}
            />
            <Drawer
                open={isOpen}
                onClose={close}
                size={DRAWER_WIDTH}
                title="Menu"
                classNames={{ body: styles.drawerBody }}
            >
                {/* The snapshot keeps no name or email, so until the session loads a member's block has nothing
                    to show. */}
                {hasAccount && (user || !isEmailConfirmed) && (
                    <div className={styles.drawerUser}>
                        {user && (
                            <>
                                <span className={styles.drawerUserName}>{user.name}</span>
                                <span className={styles.drawerUserEmail}>{user.email}</span>
                            </>
                        )}
                        {quota && <span className={styles.drawerUserQuota}>{formatQuotaLeft(quota)}</span>}
                        {!isEmailConfirmed && (
                            <Button
                                type="primary"
                                block
                                className={user ? 'mt-2' : undefined}
                                disabled={isInert}
                                onClick={handleConfirmEmail}
                            >
                                Confirm email
                            </Button>
                        )}
                    </div>
                )}
                {isAnonymous && (
                    <div className={cx(styles.drawerUser, 'gap-2')}>
                        {quota && <span className={styles.drawerUserQuota}>{formatQuotaLeft(quota)}</span>}
                        <Button type="primary" block disabled={isInert} onClick={handleSignIn}>
                            Sign In
                        </Button>
                    </div>
                )}
                <nav className={styles.drawerNav} aria-label="Main">
                    {MENU_LINKS.filter((link) => canOpen(link.access, isSignedIn, isEmailConfirmed)).map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={styles.drawerItem}
                            data-active={pathname === link.href}
                            aria-current={pathname === link.href ? 'page' : undefined}
                            onClick={close}
                        >
                            {link.icon}
                            {link.label}
                        </Link>
                    ))}
                    <button type="button" className={styles.drawerItem} onClick={handleContact}>
                        <MailOutlined />
                        Contact support
                    </button>
                </nav>
                <div className={styles.drawerThemeRow}>
                    <span>Dark mode</span>
                    <ThemeSwitch />
                </div>
                {hasAccount && (
                    <button
                        type="button"
                        className={styles.drawerItem}
                        data-danger="true"
                        disabled={isInert}
                        onClick={handleSignOut}
                    >
                        <LogoutOutlined />
                        Sign Out
                    </button>
                )}
                {isAnonymous && (
                    <button
                        type="button"
                        className={styles.drawerItem}
                        data-danger="true"
                        disabled={isInert}
                        onClick={handleForgetBrowser}
                    >
                        <LogoutOutlined />
                        Forget this browser
                    </button>
                )}
            </Drawer>
        </>
    )
}
