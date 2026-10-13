'use client'

import { SaveOutlined, TagFilled } from '@ant-design/icons'
import type { AnalysisSettingsInput, Preset } from 'adlens-shared'
import { Button, Tooltip } from 'antd'
import { useTheme } from 'antd-style'
import { useState } from 'react'
import { ApplyPresetPopover } from './ApplyPresetPopover'
import { PresetModal } from './PresetModal'
import { isSameSettings } from './same-settings'

interface IProps {
    settings: AnalysisSettingsInput
    appliedPreset: Preset | null
    onApply: (preset: Preset) => void
    isDisabled?: boolean
}

export function PresetActions({ settings, appliedPreset, onApply, isDisabled }: IProps) {
    const token = useTheme()

    const [isSaveOpen, setIsSaveOpen] = useState(false)

    // Shown exactly while a run would count for the preset (spec D4, D18).
    const isSelected = appliedPreset !== null && isSameSettings(settings, appliedPreset.settings)

    return (
        <div className="d-flex align-items-center gap-1">
            {isSelected && (
                <Tooltip title={`Preset: ${appliedPreset.name}`}>
                    <TagFilled
                        role="img"
                        aria-label={`Preset: ${appliedPreset.name}`}
                        tabIndex={0}
                        className="px-2"
                        style={{ color: token.colorPrimary }}
                    />
                </Tooltip>
            )}
            <Tooltip title="Save as preset">
                <Button
                    type="text"
                    icon={<SaveOutlined />}
                    aria-label="Save as preset"
                    disabled={isDisabled}
                    onClick={() => setIsSaveOpen(true)}
                />
            </Tooltip>
            <ApplyPresetPopover onApply={onApply} isDisabled={isDisabled} />
            <PresetModal
                isOpen={isSaveOpen}
                initialSettings={settings}
                title="Save as preset"
                onClose={() => setIsSaveOpen(false)}
            />
        </div>
    )
}
