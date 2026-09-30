'use client'

import { LogoutOutlined, MailOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, MenuProps } from 'antd'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useForgetBrowser } from '@/hooks/useForgetBrowser'
import { useHoverCapable } from '@/hooks/useHoverCapable'
import { useSignOut } from '@/hooks/useSignOut'
import { useStyles } from './styles'

enum AccountMenuKey {
    Email = 'email',
    Account = 'account',
    Contact = 'contact',
    SignOut = 'signout',
}

export function AccountMenu() {
    const { styles } = useStyles()
    const router = useRouter()
    const { isSignedIn, isAnonymous, user } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()
    const forgetBrowser = useForgetBrowser()
    const isHoverCapable = useHoverCapable()

    if (!isSignedIn) {
        return (
            <Button type="primary" onClick={() => setView('signin')}>
                Sign In
            </Button>
        )
    }

    if (isAnonymous) {
        return (
            <span className="d-flex gap-2">
                <Button type="text" onClick={forgetBrowser}>
                    Forget this browser
                </Button>
                {/* Signing in or up in this browser moves the anonymous history to the account, so one entry point
                    is enough; the dialog links to sign-up. */}
                <Button type="primary" onClick={() => setView('signin')}>
                    Sign In
                </Button>
            </span>
        )
    }

    const items: MenuProps['items'] = [
        { key: AccountMenuKey.Email, label: user?.email, disabled: true },
        { type: 'divider' },
        { key: AccountMenuKey.Account, label: 'Account', icon: <SettingOutlined /> },
        { key: AccountMenuKey.Contact, label: 'Contact support', icon: <MailOutlined /> },
        { type: 'divider' },
        { key: AccountMenuKey.SignOut, label: 'Sign Out', icon: <LogoutOutlined />, danger: true },
    ]

    const handleClick: MenuProps['onClick'] = ({ key }) => {
        if (key === AccountMenuKey.Account) {
            router.push('/account')
            return
        }

        if (key === AccountMenuKey.Contact) {
            setIsContactOpen(true)
            return
        }

        if (key === AccountMenuKey.SignOut) {
            void signOut()
        }
    }

    return (
        <Dropdown
            trigger={isHoverCapable ? ['hover'] : ['click']}
            placement="bottomRight"
            menu={{ items, onClick: handleClick }}
        >
            <button type="button" className={styles.accountAvatar} aria-label="Account menu">
                <Avatar size={32} icon={<UserOutlined />} />
            </button>
        </Dropdown>
    )
}
