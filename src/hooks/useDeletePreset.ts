import { deletePreset } from '@/api/presets'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface UseDeletePresetResult {
    deletePreset: (id: string) => Promise<void>
    isDeleting: boolean
}

export function useDeletePreset(): UseDeletePresetResult {
    const queryClient = useQueryClient()

    const { mutateAsync, isPending } = useMutation({
        mutationFn: deletePreset,
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] }),
    })

    return { deletePreset: mutateAsync, isDeleting: isPending }
}
