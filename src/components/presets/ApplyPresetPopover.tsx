'use client'

import { usePresets } from '@/hooks/usePresets'
import { ImportOutlined } from '@ant-design/icons'
import type { Preset } from 'adlens-shared'
import { Button, Popover, Select, Tooltip } from 'antd'
import { useState } from 'react'

// Seconds before "Already applied" shows, so moving the pointer down the list doesn't flash it.
const ALREADY_APPLIED_DELAY_S = 0.4

interface IFormProps {
    presets: Preset[]
    initialId?: string
    selectedPresetId: string | null
    onApply: (preset: Preset) => void
}

const toOption = (preset: Preset, selectedPresetId: string | null) => {
    if (preset.id !== selectedPresetId) {
        return { value: preset.id, label: preset.name }
    }

    return {
        value: preset.id,
        disabled: true,
        label: (
            <Tooltip title="Already applied" mouseEnterDelay={ALREADY_APPLIED_DELAY_S}>
                <span className="d-block">{preset.name}</span>
            </Tooltip>
        ),
    }
}

// Mounted with each opening (the popover destroys it when hidden), so the choice starts from the last used preset.
const ApplyPresetForm = ({ presets, initialId, selectedPresetId, onApply }: IFormProps) => {
    const [presetId, setPresetId] = useState(initialId)

    const preset = presets.find((item) => item.id === presetId)
    const options = presets.map((item) => toOption(item, selectedPresetId))

    return (
        <div className="d-flex gap-2">
            <Select
                value={presetId}
                onChange={setPresetId}
                options={options}
                // No search box: on a phone tapping it opens the keyboard over a short list.
                showSearch={false}
                placeholder="Choose a preset"
                aria-label="Preset"
                style={{ width: '14rem' }}
            />
            <Button type="primary" disabled={!preset} onClick={() => preset && onApply(preset)}>
                Apply
            </Button>
        </div>
    )
}

interface IProps {
    onApply: (preset: Preset) => void
    // The preset the settings hold right now: applying it again would change nothing.
    selectedPresetId?: string | null
    isDisabled?: boolean
}

export function ApplyPresetPopover({ onApply, selectedPresetId = null, isDisabled }: IProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Without a session the list never loads, so it reads as empty too.
    const { presets, lastUsedPreset, isLoading } = usePresets()

    const hasPresets = !isLoading && presets.length > 0
    // A disabled choice can't be applied, so the applied preset is never the one preselected.
    const initialId = lastUsedPreset && lastUsedPreset.id !== selectedPresetId ? lastUsedPreset.id : undefined
    const isUnavailable = !hasPresets || Boolean(isDisabled)

    const handleOpenChange = (next: boolean) => setIsOpen(next && !isUnavailable)

    const handleApply = (preset: Preset) => {
        onApply(preset)
        setIsOpen(false)
    }

    return (
        <Popover
            open={isOpen}
            onOpenChange={handleOpenChange}
            trigger="click"
            placement="bottomRight"
            destroyOnHidden
            content={
                <ApplyPresetForm
                    presets={presets}
                    initialId={initialId}
                    selectedPresetId={selectedPresetId}
                    onApply={handleApply}
                />
            }
        >
            <Tooltip title={hasPresets ? 'Apply a preset' : 'No presets yet'}>
                {/* A disabled button takes no pointer events, so the wrapper carries the tooltip and the click. */}
                <span className="d-inline-flex">
                    <Button
                        type="text"
                        icon={<ImportOutlined />}
                        aria-label="Apply a preset"
                        disabled={isUnavailable}
                    />
                </span>
            </Tooltip>
        </Popover>
    )
}
