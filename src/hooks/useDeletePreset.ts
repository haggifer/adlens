import { deletePreset } from '@/api/presets'
import { PRESETS_KEY, refreshPresetsWhenGone } from '@/hooks/usePresets'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface UseDeletePresetResult {
    deletePreset: (id: string) => Promise<void>
    isDeleting: boolean
}

export function useDeletePreset(): UseDeletePresetResult {
    const queryClient = useQueryClient()

    const { mutateAsync, isPending } = useMutation({
        mutationFn: deletePreset,
        // Returned, so the mutation settles only once the list has refetched: until then the old list (a deleted row,
        // the previous default's star) would show again.
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] }),
        onError: (error) => refreshPresetsWhenGone(queryClient, error),
    })

    return { deletePreset: mutateAsync, isDeleting: isPending }
}
