'use client'

import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { App, Avatar, Button, Dropdown, MenuProps } from 'antd'
import { logout } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import useHoverCapable from '@/hooks/useHoverCapable'
import { useStyles } from './styles'

export default function AccountMenu() {
    const { styles } = useStyles()
    const { isSignedIn, openAuth } = useAuth()
    const { message } = App.useApp()
    const hoverCapable = useHoverCapable()

    if (!isSignedIn) {
        return (
            <Button type="primary" onClick={() => openAuth('signin')}>
                Sign In
            </Button>
        )
    }

    const items: MenuProps['items'] = [
        { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
        { type: 'divider' },
        { key: 'signout', label: 'Sign Out', icon: <LogoutOutlined />, danger: true },
    ]

    const handleClick: MenuProps['onClick'] = ({ key }) => {
        if (key === 'settings') {
            message.info('Settings are not available yet.')
            return
        }

        if (key === 'signout') {
            void logout()
        }
    }

    return (
        <Dropdown
            trigger={hoverCapable ? ['hover'] : ['click']}
            placement="bottomRight"
            menu={{ items, onClick: handleClick }}
        >
            <button type="button" className={styles.accountAvatar} aria-label="Account menu">
                <Avatar size={32} icon={<UserOutlined />} />
            </button>
        </Dropdown>
    )
}
