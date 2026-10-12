'use client'

import { isConfirmedKind } from '@/auth/account-kind'
import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { formatQuotaLeft, getQuotaResetDate } from '@/components/layout/quota-label'
import { ThemeSwitch } from '@/components/layout/ThemeSwitch'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useQuota } from '@/hooks/useQuota'
import { useShownAccountKind } from '@/hooks/useShownAccountKind'
import { useSignOut } from '@/hooks/useSignOut'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import {
    FileSearchOutlined,
    HistoryOutlined,
    LogoutOutlined,
    MailOutlined,
    MenuOutlined,
    SettingOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import { Button, Divider, Drawer } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { getSessionControlProps } from './session-control'
import { useStyles } from './styles'

// Who may open a link: anyone, any session (anonymous ones too), or only an account whose email is confirmed.
type LinkAccess = 'public' | 'session' | 'account'

interface MenuLink {
    href: string
    label: string
    icon: ReactNode
    access: LinkAccess
}

const DRAWER_WIDTH = 300

const MENU_LINKS: MenuLink[] = [
    { href: '/', label: 'Analyze', icon: <UploadOutlined />, access: 'public' },
    { href: '/history', label: 'History', icon: <HistoryOutlined />, access: 'session' },
    { href: '/demo', label: 'Examples', icon: <FileSearchOutlined />, access: 'public' },
    { href: '/account', label: 'Account', icon: <SettingOutlined />, access: 'account' },
]

const isLinkAllowed = (access: LinkAccess, isSignedIn: boolean, isEmailConfirmed: boolean) => {
    if (access === 'public') {
        return true
    }

    return access === 'session' ? isSignedIn : isEmailConfirmed
}

export function MobileMenu() {
    const { styles } = useStyles()
    const pathname = usePathname()
    const { user } = useAuth()
    // While the session loads, the remembered kind is drawn as it will be, with every session action ignored.
    const { kind, isInert } = useShownAccountKind()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()

    const [isOpen, setIsOpen] = useState(false)

    const handleClose = () => setIsOpen(false)
    const { swipeHandlers, resetSwipe } = useSwipeToClose(handleClose)

    const { quota } = useQuota()

    const isSignedIn = kind !== null
    const isAnonymous = kind === AccountKind.Anonymous
    const isEmailConfirmed = isConfirmedKind(kind)
    // Confirmed or not: either way the user typed the address, so it may be shown.
    const hasAccount = isSignedIn && !isAnonymous
    const visibleLinks = MENU_LINKS.filter((link) => isLinkAllowed(link.access, isSignedIn, isEmailConfirmed))
    const quotaResetDate = quota ? getQuotaResetDate(quota) : null

    const handleContact = () => {
        handleClose()
        setIsContactOpen(true)
    }

    const handleSignOut = () => {
        handleClose()
        void signOut()
    }

    const handleSignIn = () => {
        handleClose()
        setView('signin')
    }

    const handleConfirmEmail = () => {
        handleClose()
        setView('confirm')
    }

    // pan-y leaves vertical moves to the browser, so the menu scrolls, and gives horizontal ones to the swipe.
    const renderSwipeablePanel = (panel: ReactNode) => (
        <div {...swipeHandlers} className="h-100" style={{ touchAction: 'pan-y' }}>
            {panel}
        </div>
    )

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
                onClose={handleClose}
                size={DRAWER_WIDTH}
                title="Menu"
                classNames={{ body: styles.drawerBody }}
                drawerRender={renderSwipeablePanel}
                afterOpenChange={(isNowOpen) => !isNowOpen && resetSwipe()}
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
                        {quota && (
                            <>
                                <Divider className={styles.drawerUserDivider} />
                                <span className={styles.drawerUserQuota}>
                                    {formatQuotaLeft(quota)}
                                    {quotaResetDate && ` (resets at ${quotaResetDate})`}
                                </span>
                            </>
                        )}
                        {!isEmailConfirmed && (
                            <Button
                                type="primary"
                                block
                                className={user ? 'mt-2' : undefined}
                                {...getSessionControlProps(isInert, handleConfirmEmail)}
                            >
                                Confirm email
                            </Button>
                        )}
                    </div>
                )}
                {isAnonymous && (
                    <div className={styles.drawerUser}>
                        <Button type="primary" block {...getSessionControlProps(isInert, handleSignIn)}>
                            Sign In
                        </Button>
                    </div>
                )}
                <nav className={styles.drawerNav} aria-label="Main">
                    {visibleLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={styles.drawerItem}
                            data-active={pathname === link.href}
                            aria-current={pathname === link.href ? 'page' : undefined}
                            onClick={handleClose}
                        >
                            {link.icon}
                            {link.label}
                        </Link>
                    ))}
                    <button type="button" className={styles.drawerItem} onClick={handleContact}>
                        <MailOutlined />
                        Contact us
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
                        {...getSessionControlProps(isInert, handleSignOut)}
                    >
                        <LogoutOutlined />
                        Sign Out
                    </button>
                )}
            </Drawer>
        </>
    )
}
