'use client'

import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { useHoverCapable } from '@/hooks/useHoverCapable'
import { useShownAccountKind } from '@/hooks/useShownAccountKind'
import { useSignOut } from '@/hooks/useSignOut'
import { LogoutOutlined, MailOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, type DropdownProps, MenuProps } from 'antd'
import { useRouter } from 'next/navigation'
import { type KeyboardEvent, useState } from 'react'
import { getSessionControlProps } from './session-control'
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
    const { user } = useAuth()
    // While the session loads, the remembered kind is drawn as it will be, with every session action ignored.
    const { kind, isInert } = useShownAccountKind()
    const setView = useAuthModalStore((s) => s.setView)
    const setIsContactOpen = useContactModalStore((s) => s.setIsOpen)
    const signOut = useSignOut()
    const isHoverCapable = useHoverCapable()

    const [isOpen, setIsOpen] = useState(false)
    // Moves focus into the menu only when the keyboard opened it; a hover leaves focus where it is.
    const [isOpenedByKeyboard, setIsOpenedByKeyboard] = useState(false)

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
        if (isInert) {
            return
        }

        setIsOpen(isNextOpen)

        if (!isNextOpen) {
            setIsOpenedByKeyboard(false)
        }
    }

    // A click trigger already opens from the keyboard, since Enter and Space click a button.
    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (isInert || !isHoverCapable || !OPEN_KEYS.has(event.key)) {
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

    // Signed out, or nothing remembered while the session loads: most visitors have no session, so Sign In is drawn at
    // once rather than after the session request. An anonymous session gets the same single entry point: signing in or
    // up in this browser moves its history to the account, and the dialog links to sign-up.
    if (!kind || kind === AccountKind.Anonymous) {
        return (
            <Button type="primary" {...getSessionControlProps(isInert, () => setView('signin'))}>
                Sign In
            </Button>
        )
    }

    // Until the email is confirmed there is no account page to offer, only the way to confirm it.
    if (kind === AccountKind.Unconfirmed) {
        return (
            <span className="d-flex gap-2">
                <Button type="primary" {...getSessionControlProps(isInert, () => setView('confirm'))}>
                    Confirm email
                </Button>
                <Button type="text" {...getSessionControlProps(isInert, () => void signOut())}>
                    Sign Out
                </Button>
            </span>
        )
    }

    // The same dropdown while inert, held shut, so the avatar the session wires is the one already drawn.
    return (
        <Dropdown
            trigger={isHoverCapable ? HOVER_TRIGGERS : TOUCH_TRIGGERS}
            open={isOpen && !isInert}
            onOpenChange={handleOpenChange}
            autoFocus={isOpenedByKeyboard}
            placement="bottomRight"
            menu={{ items, onClick: handleClick }}
        >
            <button
                type="button"
                className={styles.accountAvatar}
                aria-label="Account menu"
                aria-disabled={isInert || undefined}
                aria-haspopup={isInert ? undefined : 'menu'}
                aria-expanded={isInert ? undefined : isOpen}
                onKeyDown={handleTriggerKeyDown}
            >
                <Avatar size={32} icon={<UserOutlined />} />
            </button>
        </Dropdown>
    )
}
