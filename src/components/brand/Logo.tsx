'use client'

import { useStyles } from './styles'

export function Logo() {
    const { styles } = useStyles()

    return (
        <span className={styles.logo}>
            <span className={styles.logoMark} aria-hidden="true" />
            <span className={styles.logoText}>AdLens</span>
        </span>
    )
}
