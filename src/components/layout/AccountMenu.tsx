'use client'

import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { App, Avatar, Button, Dropdown, MenuProps } from 'antd'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import useHoverCapable from '@/hooks/useHoverCapable'
import { useStyles } from './styles'

enum AccountMenuKey {
    Email = 'email',
    Account = 'account',
    SignOut = 'signout',
}

export default function AccountMenu() {
    const { styles } = useStyles()
    const router = useRouter()
    const { isSignedIn, user, signOut } = useAuth()
    const setView = useAuthModalStore((s) => s.setView)
    const { notification } = App.useApp()
    const isHoverCapable = useHoverCapable()

    if (!isSignedIn) {
        return (
            <Button type="primary" onClick={() => setView('signin')}>
                Sign In
            </Button>
        )
    }

    const items: MenuProps['items'] = [
        { key: AccountMenuKey.Email, label: user?.email, disabled: true },
        { type: 'divider' },
        { key: AccountMenuKey.Account, label: 'Account', icon: <SettingOutlined /> },
        { type: 'divider' },
        { key: AccountMenuKey.SignOut, label: 'Sign Out', icon: <LogoutOutlined />, danger: true },
    ]

    const handleSignOut = async () => {
        try {
            await signOut()
            router.push('/')
        } catch (error) {
            console.error(error)
            notification.error({ message: 'Could not sign out. Please try again.', placement: 'bottomRight' })
        }
    }

    const handleClick: MenuProps['onClick'] = ({ key }) => {
        if (key === AccountMenuKey.Account) {
            router.push('/account')
            return
        }

        if (key === AccountMenuKey.SignOut) {
            void handleSignOut()
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
