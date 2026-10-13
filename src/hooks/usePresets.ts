import { type ApiRequestError, toApiRequestError } from '@/api/errors'
import { listPresets } from '@/api/presets'
import { useAuth } from '@/auth/AuthContext'
import { type QueryClient, useQuery } from '@tanstack/react-query'
import { type Preset, RequestErrorCode } from 'adlens-shared'
import { useMemo } from 'react'

export interface UsePresetsResult {
    presets: Preset[]
    defaultPreset: Preset | null
    lastUsedPreset: Preset | null
    isLoading: boolean
    error: ApiRequestError | null
}

export const PRESETS_KEY = 'presets'

const NO_PRESETS: Preset[] = []

const sortByName = (presets: Preset[]): Preset[] =>
    [...presets].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

// ISO timestamps in one format compare as strings.
const isUsedAfter = (preset: Preset, other: Preset | null): boolean =>
    preset.lastUsedAt !== null && (!other?.lastUsedAt || preset.lastUsedAt > other.lastUsedAt)

const findLastUsed = (presets: Preset[]): Preset | null =>
    presets.reduce<Preset | null>((last, preset) => (isUsedAfter(preset, last) ? preset : last), null)

// A preset deleted in another tab answers NOT_FOUND; refetching drops its stale row.
export const refreshPresetsWhenGone = (queryClient: QueryClient, error: unknown) => {
    if (toApiRequestError(error).code === RequestErrorCode.NotFound) {
        void queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] })
    }
}

export function usePresets(): UsePresetsResult {
    const { user } = useAuth()

    const { data, isLoading, error } = useQuery({
        queryKey: [PRESETS_KEY, user?.id],
        queryFn: listPresets,
        enabled: Boolean(user),
    })

    const presets = useMemo(() => sortByName(data ?? NO_PRESETS), [data])

    return {
        presets,
        defaultPreset: presets.find((preset) => preset.isDefault) ?? null,
        lastUsedPreset: findLastUsed(presets),
        isLoading,
        error: error as ApiRequestError | null,
    }
}
