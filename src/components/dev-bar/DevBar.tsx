'use client'

import { ColorPicker, Select } from 'antd'
import { AMBIENT_BACKGROUNDS, AmbientId } from '@/design/backgrounds'
import { useHarness } from '@/design/harness/HarnessContext'
import { PRIMARY_PRESETS } from '@/design/primary-presets'
import { RUN_ACCENTS, RunAccentId } from '@/design/run-accents'
import { useStyles } from './styles'

// TEMPORARY design harness. Switches the ambient backdrop, picks the brand primary (preset or custom),
// picks the Run-button accent — none of which ship in production.
const AMBIENT_OPTIONS = AMBIENT_BACKGROUNDS.map((option) => ({ value: option.id, label: option.name }))

const RUN_ACCENT_OPTIONS = RUN_ACCENTS.map((option) => ({ value: option.id, label: option.name }))

const PRIMARY_OPTIONS = PRIMARY_PRESETS.map((preset) => ({
    value: preset.value,
    label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
                style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: preset.value,
                    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.18)',
                }}
            />
            {preset.name}
        </span>
    ),
}))

export default function DevBar() {
    const { styles } = useStyles()
    const { primaryColor, setPrimaryColor, ambientId, setAmbientId, runAccent, setRunAccent } = useHarness()

    const activePreset = PRIMARY_PRESETS.find(
        (preset) => preset.value.toLowerCase() === primaryColor.toLowerCase(),
    )?.value

    return (
        <div className={styles.devBar}>
            <span className={styles.brand}>Design harness</span>
            <label className={styles.control}>
                <span className={styles.label}>Ambient</span>
                <Select
                    size="small"
                    value={ambientId}
                    options={AMBIENT_OPTIONS}
                    onChange={(value: AmbientId) => setAmbientId(value)}
                />
            </label>
            <label className={styles.control}>
                <span className={styles.label}>Primary</span>
                <Select
                    size="small"
                    value={activePreset}
                    placeholder="Custom"
                    options={PRIMARY_OPTIONS}
                    onChange={(value: string) => setPrimaryColor(value)}
                />
            </label>
            <label className={styles.control}>
                <span className={styles.label}>Custom</span>
                <ColorPicker
                    size="small"
                    value={primaryColor}
                    disabledAlpha
                    showText
                    onChange={(color) => setPrimaryColor(color.toHexString())}
                />
            </label>
            <label className={styles.control}>
                <span className={styles.label}>Run accent</span>
                <Select
                    size="small"
                    value={runAccent}
                    options={RUN_ACCENT_OPTIONS}
                    onChange={(value: RunAccentId) => setRunAccent(value)}
                />
            </label>
        </div>
    )
}
