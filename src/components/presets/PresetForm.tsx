'use client'

import { describePresetError, toApiRequestError } from '@/api/errors'
import { ensureSession } from '@/auth/anonymous-session'
import { useAuth } from '@/auth/AuthContext'
import { SettingsFields } from '@/components/upload/SettingsFields'
import { Field } from '@/components/utils/Field'
import { usePresets } from '@/hooks/usePresets'
import { useSavePreset } from '@/hooks/useSavePreset'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    type AnalysisSettingsInput,
    type Preset,
    PRESET_NAME_MAX_LENGTH,
    RequestErrorCode,
    type SavePresetInput,
    savePresetInputSchema,
} from 'adlens-shared'
import { Alert, App, Button, Checkbox, Input, Popconfirm } from 'antd'
import { type FormEvent, useState } from 'react'
import { Controller, type ControllerRenderProps, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { isSameName } from './preset-name'

const presetFormSchema = savePresetInputSchema.omit({ overwrite: true })

type PresetFormInput = z.input<typeof presetFormSchema>

type PresetFormValues = z.output<typeof presetFormSchema>

const NAME_INPUT_ID = 'preset-name'

const EMPTY_SETTINGS: AnalysisSettingsInput = { platforms: [], placements: [], markets: [] }

const getDefaultValues = (preset?: Preset, initialSettings?: AnalysisSettingsInput): PresetFormInput => ({
    name: preset?.name ?? '',
    settings: preset?.settings ?? initialSettings ?? EMPTY_SETTINGS,
    isDefault: preset?.isDefault ?? false,
})

// isDefault always goes out, so unchecking the current default clears it.
const toSaveInput = (values: PresetFormValues, isOverwrite: boolean): SavePresetInput => ({
    ...values,
    isDefault: Boolean(values.isDefault),
    ...(isOverwrite && { overwrite: true }),
})

const renderSettings = ({ field }: { field: ControllerRenderProps<PresetFormInput, 'settings'> }) => (
    <SettingsFields value={field.value} onChange={field.onChange} />
)

const renderIsDefault = ({ field }: { field: ControllerRenderProps<PresetFormInput, 'isDefault'> }) => (
    <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>
        Select as default
    </Checkbox>
)

interface IProps {
    preset?: Preset
    initialSettings?: AnalysisSettingsInput
    onClose: () => void
    onSaved?: (preset: Preset) => void
}

export function PresetForm({ preset, initialSettings, onClose, onSaved }: IProps) {
    const { user } = useAuth()
    const { notification } = App.useApp()

    const [formError, setFormError] = useState<string | null>(null)
    // Kept apart from the open flag so the question keeps its name while the popconfirm fades out.
    const [clashingValues, setClashingValues] = useState<PresetFormValues | null>(null)
    const [isAskingOverwrite, setIsAskingOverwrite] = useState(false)
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<PresetFormInput, unknown, PresetFormValues>({
        resolver: zodResolver(presetFormSchema),
        defaultValues: getDefaultValues(preset, initialSettings),
    })

    const { presets } = usePresets()
    const { savePreset, isSaving } = useSavePreset()

    const askOverwrite = (values: PresetFormValues) => {
        setClashingValues(values)
        setIsAskingOverwrite(true)
    }

    const save = async (values: PresetFormValues, isOverwrite: boolean) => {
        setFormError(null)

        try {
            if (!user) {
                await ensureSession()
            }

            const saved = await savePreset({ id: preset?.id, input: toSaveInput(values, isOverwrite) })

            notification.success({ title: 'Preset saved', placement: 'bottomRight' })
            onSaved?.(saved)
            onClose()
        } catch (err) {
            // Another tab took the name after this one's list loaded.
            if (toApiRequestError(err).code === RequestErrorCode.PresetNameTaken) {
                askOverwrite(values)
                return
            }

            setFormError(describePresetError(err))
        }
    }

    const handleSave = async (values: PresetFormValues) => {
        const isNameTaken = presets.some((other) => other.id !== preset?.id && isSameName(other.name, values.name))

        if (isNameTaken) {
            askOverwrite(values)
            return
        }

        await save(values, false)
    }

    // The modal renders through a portal, yet React bubbles its submit up the component tree: from the settings panel
    // it would reach the panel's own form and start an analysis.
    const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.stopPropagation()
        void handleSubmit(handleSave)(event)
    }

    const handleOverwrite = () => {
        setIsAskingOverwrite(false)

        if (clashingValues) {
            void save(clashingValues, true)
        }
    }

    return (
        <form onSubmit={handleFormSubmit}>
            {formError && <Alert className="mb-3" type="error" showIcon title={formError} />}
            <Field label="Name" htmlFor={NAME_INPUT_ID} error={errors.name?.message}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            id={NAME_INPUT_ID}
                            maxLength={PRESET_NAME_MAX_LENGTH}
                            autoFocus
                            status={errors.name ? 'error' : undefined}
                        />
                    )}
                />
            </Field>
            <div className="d-flex flex-column gap-3 mb-3">
                <Controller name="settings" control={control} render={renderSettings} />
            </div>
            <Controller name="isDefault" control={control} render={renderIsDefault} />
            <div className="d-flex justify-content-end gap-2 mt-4">
                <Button onClick={onClose}>Cancel</Button>
                <Popconfirm
                    open={isAskingOverwrite}
                    onOpenChange={(isOpen) => !isOpen && setIsAskingOverwrite(false)}
                    title={`A preset named “${clashingValues?.name}” already exists. Overwrite it?`}
                    okText="Overwrite"
                    cancelText="Cancel"
                    onConfirm={handleOverwrite}
                >
                    <Button type="primary" htmlType="submit" loading={isSubmitting || isSaving}>
                        Save
                    </Button>
                </Popconfirm>
            </div>
        </form>
    )
}
