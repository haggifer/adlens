'use client'

import { Spin } from 'antd'
import { useStyles } from './styles'

// The empty settings panel, so the column keeps its box while the form or the data it starts from loads.
export function SettingsPlaceholder() {
    const { styles, cx } = useStyles()

    return (
        <div className={cx(styles.panel, styles.settingsPanel, 'align-items-center justify-content-center')}>
            <Spin />
        </div>
    )
}
