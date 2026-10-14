import { deletePreset } from '@/api/presets'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useDeletePreset } from './useDeletePreset'

// The presets key's module reads the session; the real auth client needs a browser.
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/api/presets', () => ({ deletePreset: jest.fn() }))

describe('useDeletePreset', () => {
    // Settled earlier, the deleted row would show again until the list came back.
    it('settles only once the presets have been fetched again', async () => {
        let finishRefresh!: () => void
        const queryClient = createTestQueryClient()
        const invalidate = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockReturnValue(new Promise<void>((resolve) => (finishRefresh = resolve)))
        const { result } = renderHook(() => useDeletePreset(), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            ),
        })
        const onSettled = jest.fn()

        jest.mocked(deletePreset).mockResolvedValue(undefined)
        await act(async () => void result.current.deletePreset('preset-1').then(onSettled))

        expect(invalidate).toHaveBeenCalledWith({ queryKey: [PRESETS_KEY] })
        expect(onSettled).not.toHaveBeenCalled()

        await act(async () => finishRefresh())

        expect(onSettled).toHaveBeenCalled()
    })
})
