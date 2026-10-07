'use client'

import { createGlobalStyle } from 'antd-style'
import { useStyles } from './styles'

// The scrollbar gutter globals.css reserves shows the root's own background, which would otherwise be the browser's
// default rather than the page's.
const RootBackground = createGlobalStyle`
    html {
        background: ${({ theme }) => theme.colorBgLayout};
    }
`

export function AmbientBackground() {
    const { styles } = useStyles()

    return (
        <>
            <RootBackground />
            <div className={styles.ambient} aria-hidden="true" />
        </>
    )
}
