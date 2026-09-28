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
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useQuota } from '@/hooks/useQuota'
import { useSignOut } from '@/hooks/useSignOut'
import { useStyles } from './styles'

const DRAWER_WIDTH = 300

interface MenuLink {
    href: string
    label: string
    icon: ReactNode
    isPrivate: boolean
}

const MENU_LINKS: MenuLink[] = [
    { href: '/', label: 'Analyze', icon: <UploadOutlined />, isPrivate: false },
    { href: '/history', label: 'History', icon: <HistoryOutlined />, isPrivate: true },
    { href: '/account', label: 'Account', icon: <SettingOutlined />, isPrivate: true },
]

export function MobileMenu() {
    const { styles } = useStyles()
    const pathname = usePathname()
    const { isSignedIn, user } = useAuth()
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()
    const { quota } = useQuota()
    const [isOpen, setIsOpen] = useState(false)

    const close = () => setIsOpen(false)

    const handleContact = () => {
        close()
        setIsContactOpen(true)
    }

    const handleSignOut = () => {
        close()
        void signOut()
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
                {isSignedIn && user && (
                    <div className={styles.drawerUser}>
                        <span className={styles.drawerUserName}>{user.name}</span>
                        <span className={styles.drawerUserEmail}>{user.email}</span>
                        {quota && <span className={styles.drawerUserQuota}>{formatQuotaLeft(quota)}</span>}
                    </div>
                )}
                <nav className={styles.drawerNav} aria-label="Main">
                    {MENU_LINKS.filter((link) => isSignedIn || !link.isPrivate).map((link) => (
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
                {isSignedIn && (
                    <button type="button" className={styles.drawerItem} data-danger="true" onClick={handleSignOut}>
                        <LogoutOutlined />
                        Sign Out
                    </button>
                )}
            </Drawer>
        </>
    )
}
