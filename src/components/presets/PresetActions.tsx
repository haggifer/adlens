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
    onSaved: (preset: Preset) => void
    isDisabled?: boolean
}

export function PresetActions({ settings, appliedPreset, onApply, onSaved, isDisabled }: IProps) {
    const token = useTheme()

    const [isSaveOpen, setIsSaveOpen] = useState(false)

    // Shown exactly while the API would count a run towards the preset: its settings, in any order.
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
                {/* A disabled button takes no pointer events, so the wrapper carries the tooltip during a run. */}
                <span className="d-inline-flex">
                    <Button
                        type="text"
                        icon={<SaveOutlined />}
                        aria-label="Save as preset"
                        disabled={isDisabled}
                        onClick={() => setIsSaveOpen(true)}
                    />
                </span>
            </Tooltip>
            <ApplyPresetPopover onApply={onApply} isDisabled={isDisabled} />
            <PresetModal
                isOpen={isSaveOpen}
                initialSettings={settings}
                title="Save as preset"
                onClose={() => setIsSaveOpen(false)}
                onSaved={onSaved}
            />
        </div>
    )
}
