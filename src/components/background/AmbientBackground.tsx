'use client'

import { useStyles } from './styles'

export function AmbientBackground() {
    const { styles } = useStyles()

    return <div className={styles.ambient} aria-hidden="true" />
}
