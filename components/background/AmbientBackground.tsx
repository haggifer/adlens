'use client'

import { useHarness } from '@/lib/design/harness/HarnessContext'
import useStyles from './styles'

// A fixed, viewport-filling backdrop rendered behind the app content. The active option comes from the
// design harness; the visuals live in styles.ts, keyed by the data-ambient attribute.
export default function AmbientBackground() {
    const { styles } = useStyles()
    const { ambientId } = useHarness()

    return <div className={styles.ambient} data-ambient={ambientId} aria-hidden="true" />
}
