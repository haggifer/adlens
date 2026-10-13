import { listPresets } from '@/api/presets'
import type { AuthContextValue } from '@/auth/AuthContext'
import { memberAuth, signedOutAuth } from '@/test/auth'
import { buildPreset } from '@/test/fixtures'
import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { Preset } from 'adlens-shared'
import type { ReactNode } from 'react'
import { usePresets } from './usePresets'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/presets', () => ({ listPresets: jest.fn() }))

const renderUsePresets = () => {
    const queryClient = createTestQueryClient()

    return renderHook(() => usePresets(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
    })
}

const renderPresets = async (presets: Preset[]) => {
    mockUseAuth.mockReturnValue(memberAuth())
    jest.mocked(listPresets).mockResolvedValue(presets)

    const { result } = renderUsePresets()

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    return result.current
}

describe('usePresets', () => {
    beforeEach(() => jest.mocked(listPresets).mockReset())

    it('lists the presets by name, ignoring case', async () => {
        const { presets } = await renderPresets([
            buildPreset({ id: 'b', name: 'stories' }),
            buildPreset({ id: 'c', name: 'Reels' }),
            buildPreset({ id: 'a', name: 'Feed' }),
        ])

        expect(presets.map((preset) => preset.name)).toEqual(['Feed', 'Reels', 'stories'])
    })

    it('finds the default preset and the one used last', async () => {
        const { defaultPreset, lastUsedPreset } = await renderPresets([
            buildPreset({ id: 'a', name: 'Feed', lastUsedAt: '2026-10-01T10:00:00.000Z' }),
            buildPreset({ id: 'b', name: 'Reels', isDefault: true }),
            buildPreset({ id: 'c', name: 'Stories', lastUsedAt: '2026-10-12T10:00:00.000Z' }),
        ])

        expect(defaultPreset?.id).toBe('b')
        expect(lastUsedPreset?.id).toBe('c')
    })

    it('has no default and no last used preset while none is set or has been used', async () => {
        const { defaultPreset, lastUsedPreset } = await renderPresets([
            buildPreset({ id: 'a', name: 'Feed' }),
            buildPreset({ id: 'b', name: 'Reels' }),
        ])

        expect(defaultPreset).toBeNull()
        expect(lastUsedPreset).toBeNull()
    })

    it('loads nothing without a session', () => {
        mockUseAuth.mockReturnValue(signedOutAuth())

        const { result } = renderUsePresets()

        expect(result.current.presets).toEqual([])
        expect(listPresets).not.toHaveBeenCalled()
    })
})
