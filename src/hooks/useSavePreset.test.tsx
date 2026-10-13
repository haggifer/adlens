import { createPreset, updatePreset } from '@/api/presets'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { buildPreset } from '@/test/fixtures'
import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { SavePresetInput } from 'adlens-shared'
import type { ReactNode } from 'react'
import { useSavePreset } from './useSavePreset'

// The presets key's module reads the session; the real auth client needs a browser.
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/api/presets', () => ({ createPreset: jest.fn(), updatePreset: jest.fn() }))

const PRESET = buildPreset()

const INPUT: SavePresetInput = { name: PRESET.name, settings: PRESET.settings }

const renderSavePreset = () => {
    const queryClient = createTestQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSavePreset(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
    })

    return { result, invalidate }
}

describe('useSavePreset', () => {
    beforeEach(() => {
        jest.mocked(createPreset).mockReset().mockResolvedValue(PRESET)
        jest.mocked(updatePreset).mockReset().mockResolvedValue(PRESET)
    })

    it('creates a preset without an id, and refreshes every user’s presets', async () => {
        const { result, invalidate } = renderSavePreset()

        await act(() => result.current.savePreset({ input: INPUT }))

        expect(createPreset).toHaveBeenCalledWith(INPUT)
        expect(updatePreset).not.toHaveBeenCalled()
        // The save may have just started an anonymous session, so the pre-save user id can be stale.
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [PRESETS_KEY] })
    })

    it('updates the preset with the id it is given', async () => {
        const { result } = renderSavePreset()

        await act(() => result.current.savePreset({ id: PRESET.id, input: INPUT }))

        expect(updatePreset).toHaveBeenCalledWith(PRESET.id, INPUT)
        expect(createPreset).not.toHaveBeenCalled()
    })
})
