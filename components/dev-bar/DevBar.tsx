'use client'

import { ColorPicker, Switch } from 'antd'
import { useAuthUi } from '@/lib/auth/AuthUiContext'
import { useHarness } from '@/lib/design/harness/HarnessContext'
import useStyles from './styles'

// TEMPORARY design harness. Scheme (light/dark) graduated to the header theme switcher; this panel now
// only holds the dev-only knobs: the primary-color override and the signed-in simulation.
export default function DevBar() {
    const { styles } = useStyles()
    const { primaryColor, setPrimaryColor } = useHarness()
    const { isSignedIn, setSignedIn } = useAuthUi()

    return (
        <div className={styles.devBar}>
            <span className={styles.brand}>Neon · harness</span>
            <label className={styles.control}>
                <span className={styles.label}>Primary</span>
                <ColorPicker
                    size="small"
                    value={primaryColor}
                    disabledAlpha
                    showText
                    onChange={(color) => setPrimaryColor(color.toHexString())}
                />
            </label>
            <label className={styles.controlPush}>
                <span className={styles.label}>Signed in</span>
                <Switch size="small" checked={isSignedIn} onChange={setSignedIn} />
            </label>
        </div>
    )
}
