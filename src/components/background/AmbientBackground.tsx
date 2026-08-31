'use client'

import { useHarness } from '@/design/harness/HarnessContext'
import useStyles from './styles'

export default function AmbientBackground() {
    const { styles } = useStyles()
    const { ambientId } = useHarness()

    return <div className={styles.ambient} data-ambient={ambientId} aria-hidden="true" />
}
