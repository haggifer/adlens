import { setDefaultPreset } from '@/api/presets'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useSetDefaultPreset } from './useSetDefaultPreset'

// The presets key's module reads the session; the real auth client needs a browser.
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/api/presets', () => ({ setDefaultPreset: jest.fn() }))

describe('useSetDefaultPreset', () => {
    // Settled earlier, the previous default’s star would show again until the list came back.
    it('settles only once the presets have been fetched again', async () => {
        let finishRefresh!: () => void
        const queryClient = createTestQueryClient()
        const invalidate = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockReturnValue(new Promise<void>((resolve) => (finishRefresh = resolve)))
        const { result } = renderHook(() => useSetDefaultPreset(), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            ),
        })
        const onSettled = jest.fn()

        jest.mocked(setDefaultPreset).mockResolvedValue(undefined)
        await act(async () => void result.current.setDefaultPreset('preset-1').then(onSettled))

        expect(invalidate).toHaveBeenCalledWith({ queryKey: [PRESETS_KEY] })
        expect(onSettled).not.toHaveBeenCalled()

        await act(async () => finishRefresh())

        expect(onSettled).toHaveBeenCalled()
    })
})
