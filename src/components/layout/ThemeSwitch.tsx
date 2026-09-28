'use client'

import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Switch } from 'antd'
import { useTheme } from '@/design/ThemeContext'

export function ThemeSwitch() {
    const { isDark, setScheme } = useTheme()

    return (
        <Switch
            checked={isDark}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            onChange={(checked) => setScheme(checked ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
        />
    )
}
