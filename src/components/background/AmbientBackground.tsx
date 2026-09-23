'use client'

import { useStyles } from './styles'

export default function AmbientBackground() {
    const { styles } = useStyles()

    return <div className={styles.ambient} aria-hidden="true" />
}
