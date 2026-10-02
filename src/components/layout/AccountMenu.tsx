'use client'

import { LogoutOutlined, MailOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, type DropdownProps, MenuProps } from 'antd'
import { useRouter } from 'next/navigation'
import { type KeyboardEvent, useState } from 'react'
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

// Hover alone: with click as well, a click on the hovered trigger would close the menu it just opened. The keyboard
// opens it through the trigger's own key handler instead.
const HOVER_TRIGGERS: DropdownProps['trigger'] = ['hover']

const TOUCH_TRIGGERS: DropdownProps['trigger'] = ['click']

const OPEN_KEYS = new Set(['Enter', ' ', 'ArrowDown'])

export function AccountMenu() {
    const { styles } = useStyles()
    const router = useRouter()
    const { isSignedIn, isAnonymous, isEmailConfirmed, user } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()
    const forgetBrowser = useForgetBrowser()
    const isHoverCapable = useHoverCapable()
    const [isOpen, setIsOpen] = useState(false)
    // Moves focus into the menu only when the keyboard opened it; a hover leaves focus where it is.
    const [isOpenedByKeyboard, setIsOpenedByKeyboard] = useState(false)

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

    // Until the email is confirmed there is no account page to offer, only the way to confirm it.
    if (!isEmailConfirmed) {
        return (
            <span className="d-flex gap-2">
                <Button type="primary" onClick={() => setView('confirm')}>
                    Confirm email
                </Button>
                <Button type="text" onClick={() => void signOut()}>
                    Sign Out
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

    // Escape and Tab are handled by the dropdown itself, which closes the menu and returns focus to the trigger.
    const handleOpenChange = (isNextOpen: boolean) => {
        setIsOpen(isNextOpen)

        if (!isNextOpen) {
            setIsOpenedByKeyboard(false)
        }
    }

    // A click trigger already opens from the keyboard, since Enter and Space click a button.
    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!isHoverCapable || !OPEN_KEYS.has(event.key)) {
            return
        }

        event.preventDefault()
        setIsOpenedByKeyboard(true)
        setIsOpen(true)
    }

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
            trigger={isHoverCapable ? HOVER_TRIGGERS : TOUCH_TRIGGERS}
            open={isOpen}
            onOpenChange={handleOpenChange}
            autoFocus={isOpenedByKeyboard}
            placement="bottomRight"
            menu={{ items, onClick: handleClick }}
        >
            <button
                type="button"
                className={styles.accountAvatar}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onKeyDown={handleTriggerKeyDown}
            >
                <Avatar size={32} icon={<UserOutlined />} />
            </button>
        </Dropdown>
    )
}
