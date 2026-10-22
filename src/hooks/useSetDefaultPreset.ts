import { setDefaultPreset } from '@/api/presets'
import { PRESETS_KEY, refreshPresetsWhenGone } from '@/hooks/usePresets'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface UseSetDefaultPresetResult {
    // null unsets the default.
    setDefaultPreset: (presetId: string | null) => Promise<void>
    isSetting: boolean
}

export function useSetDefaultPreset(): UseSetDefaultPresetResult {
    const queryClient = useQueryClient()

    const { mutateAsync, isPending } = useMutation({
        mutationFn: setDefaultPreset,
        // Returned, so the mutation settles only once the list has refetched: until then the old list (the previous
        // default's star) would show again.
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] }),
        onError: (error) => refreshPresetsWhenGone(queryClient, error),
    })

    return { setDefaultPreset: mutateAsync, isSetting: isPending }
}
