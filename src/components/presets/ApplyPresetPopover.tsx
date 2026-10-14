'use client'

import { type ApiRequestError, describePresetError } from '@/api/errors'
import { usePresets } from '@/hooks/usePresets'
import { ImportOutlined } from '@ant-design/icons'
import type { Preset } from 'adlens-shared'
import { Button, Popover, Select, Tooltip } from 'antd'
import { useState } from 'react'

// Seconds before "Already applied" shows, so moving the pointer down the list doesn't flash it.
const ALREADY_APPLIED_DELAY_S = 0.4

// 14rem beside Apply, narrowed on a phone so the popover still fits a 320px screen with its padding and margins.
const SELECT_STYLE = { width: 'min(14rem, 100vw - 9rem)' }

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
                style={SELECT_STYLE}
            />
            <Button type="primary" disabled={!preset} onClick={() => preset && onApply(preset)}>
                Apply
            </Button>
        </div>
    )
}

const getTriggerTitle = (presets: Preset[], selectedPresetId: string | null, error: ApiRequestError | null) => {
    if (error && !presets.length) {
        return describePresetError(error)
    }

    // Without a session the list never loads, so it reads as empty too.
    if (!presets.length) {
        return 'No presets yet'
    }

    return presets.some((preset) => preset.id !== selectedPresetId) ? 'Apply a preset' : 'No other preset to apply'
}

interface IProps {
    onApply: (preset: Preset) => void
    // The preset the settings hold right now: applying it again would change nothing.
    selectedPresetId?: string | null
    isDisabled?: boolean
}

export function ApplyPresetPopover({ onApply, selectedPresetId = null, isDisabled }: IProps) {
    const [isOpen, setIsOpen] = useState(false)

    const { presets, lastUsedPreset, isLoading, error } = usePresets()

    // The applied preset alone leaves nothing to apply.
    const hasPresetToApply = !isLoading && presets.some((preset) => preset.id !== selectedPresetId)
    // A disabled choice can't be applied, so the applied preset is never the one preselected.
    const initialId = lastUsedPreset && lastUsedPreset.id !== selectedPresetId ? lastUsedPreset.id : undefined
    const isUnavailable = !hasPresetToApply || Boolean(isDisabled)

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
            <Tooltip title={getTriggerTitle(isLoading ? [] : presets, selectedPresetId, error)}>
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
