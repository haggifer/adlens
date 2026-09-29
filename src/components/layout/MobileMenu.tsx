'use client'

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
import { useAuth } from '@/auth/AuthContext'
import { formatQuotaLeft } from '@/components/layout/quota-label'
import { ThemeSwitch } from '@/components/layout/ThemeSwitch'
import { type AuthView, useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useForgetBrowser } from '@/hooks/useForgetBrowser'
import { useQuota } from '@/hooks/useQuota'
import { useSignOut } from '@/hooks/useSignOut'
import { useStyles } from './styles'

const DRAWER_WIDTH = 300

// Who may open a link: anyone, any session (anonymous ones too), or only a real account.
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

const canOpen = (access: LinkAccess, isSignedIn: boolean, hasAccount: boolean) => {
    if (access === 'public') {
        return true
    }

    return access === 'session' ? isSignedIn : hasAccount
}

export function MobileMenu() {
    const { styles, cx } = useStyles()
    const pathname = usePathname()
    const { isSignedIn, isAnonymous, user } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()
    const forgetBrowser = useForgetBrowser()
    const { quota } = useQuota()
    const [isOpen, setIsOpen] = useState(false)
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
        forgetBrowser()
    }

    const handleAuth = (view: AuthView) => {
        close()
        setView(view)
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
                {hasAccount && user && (
                    <div className={styles.drawerUser}>
                        <span className={styles.drawerUserName}>{user.name}</span>
                        <span className={styles.drawerUserEmail}>{user.email}</span>
                        {quota && <span className={styles.drawerUserQuota}>{formatQuotaLeft(quota)}</span>}
                    </div>
                )}
                {isAnonymous && (
                    <div className={cx(styles.drawerUser, 'gap-2')}>
                        {quota && <span className={styles.drawerUserQuota}>{formatQuotaLeft(quota)}</span>}
                        <Button type="primary" block onClick={() => handleAuth('signup')}>
                            Sign up to keep your history
                        </Button>
                        <Button block onClick={() => handleAuth('signin')}>
                            Sign In
                        </Button>
                    </div>
                )}
                <nav className={styles.drawerNav} aria-label="Main">
                    {MENU_LINKS.filter((link) => canOpen(link.access, isSignedIn, hasAccount)).map((link) => (
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
                    <button type="button" className={styles.drawerItem} data-danger="true" onClick={handleSignOut}>
                        <LogoutOutlined />
                        Sign Out
                    </button>
                )}
                {isAnonymous && (
                    <button
                        type="button"
                        className={styles.drawerItem}
                        data-danger="true"
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
