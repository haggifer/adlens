import { createPreset, updatePreset } from '@/api/presets'
import { PRESETS_KEY, refreshPresetsWhenGone } from '@/hooks/usePresets'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Preset, SavePresetInput } from 'adlens-shared'

export interface SavePresetVariables {
    id?: string
    input: SavePresetInput
}

export interface UseSavePresetResult {
    savePreset: (variables: SavePresetVariables) => Promise<Preset>
    isSaving: boolean
}

const savePresetRequest = ({ id, input }: SavePresetVariables): Promise<Preset> =>
    id ? updatePreset(id, input) : createPreset(input)

export function useSavePreset(): UseSavePresetResult {
    const queryClient = useQueryClient()

    const { mutateAsync, isPending } = useMutation({
        mutationFn: savePresetRequest,
        // By prefix: the save may have just started an anonymous session, whose id the pre-save user id wouldn't match.
        // Returned, so the save settles only once the list holds the saved preset.
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] }),
        onError: (error) => refreshPresetsWhenGone(queryClient, error),
    })

    return { savePreset: mutateAsync, isSaving: isPending }
}
