import { api } from '@/api/client'
import type { Preset, PresetListResponse, PresetResponse, SavePresetInput, SetDefaultPresetInput } from 'adlens-shared'

export const listPresets = async (): Promise<Preset[]> => {
    const { data } = await api.get<PresetListResponse>('/v1/presets')

    return data.presets
}

export const createPreset = async (input: SavePresetInput): Promise<Preset> => {
    const { data } = await api.post<PresetResponse>('/v1/presets', input)

    return data.preset
}

export const updatePreset = async (id: string, input: SavePresetInput): Promise<Preset> => {
    const { data } = await api.put<PresetResponse>(`/v1/presets/${id}`, input)

    return data.preset
}

export const deletePreset = async (id: string): Promise<void> => {
    await api.delete(`/v1/presets/${id}`)
}

export const setDefaultPreset = async (presetId: string | null): Promise<void> => {
    const body: SetDefaultPresetInput = { presetId }

    await api.put('/v1/presets/default', body)
}
