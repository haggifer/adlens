'use client'

import { MODAL_WIDTH } from '@/design/theme'
import type { AnalysisSettingsInput, Preset } from 'adlens-shared'
import { Modal } from 'antd'
import { PresetForm } from './PresetForm'
import { useStyles } from './styles'

interface IProps {
    isOpen: boolean
    // Edit: the preset to change. Create / Save as preset: none.
    preset?: Preset
    // Create: empty; Save as preset: the panel's current settings; Edit: ignored (the preset's own).
    initialSettings?: AnalysisSettingsInput
    title: string
    onClose: () => void
    onSaved?: (preset: Preset) => void
}

export function PresetModal({ isOpen, preset, initialSettings, title, onClose, onSaved }: IProps) {
    const { styles } = useStyles()

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={MODAL_WIDTH}
            centered
            // The form takes its starting values when it mounts, so each opening starts from the current preset.
            destroyOnHidden
            title={<span className={styles.title}>{title}</span>}
        >
            <PresetForm preset={preset} initialSettings={initialSettings} onClose={onClose} onSaved={onSaved} />
        </Modal>
    )
}
