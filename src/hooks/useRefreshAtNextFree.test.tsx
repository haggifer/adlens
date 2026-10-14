import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useRefreshAtNextFree } from './useRefreshAtNextFree'

const NOW = new Date('2026-10-14T12:00:00.000Z')

const NEXT_FREE_AT = '2026-10-14T13:00:00.000Z'

const HOUR_MS = 60 * 60 * 1000

const renderRefresh = (nextFreeAt: string | null) => {
    const queryClient = createTestQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const view = renderHook(({ at }) => useRefreshAtNextFree(at), { wrapper, initialProps: { at: nextFreeAt } })

    return { ...view, invalidate }
}

describe('useRefreshAtNextFree', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(NOW)
    })

    afterEach(() => jest.useRealTimers())

    it('asks for the quota and the admission answer again once the next analysis has freed up', () => {
        const { invalidate } = renderRefresh(NEXT_FREE_AT)

        jest.advanceTimersByTime(HOUR_MS)

        expect(invalidate).not.toHaveBeenCalled()

        jest.advanceTimersByTime(10_000)

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['quota'] })
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admission'] })
    })

    it('sets no timer while no analysis counts', () => {
        const { invalidate } = renderRefresh(null)

        jest.advanceTimersByTime(8 * 24 * HOUR_MS)

        expect(invalidate).not.toHaveBeenCalled()
    })

    it('drops the timer when the page is left', () => {
        const { invalidate, unmount } = renderRefresh(NEXT_FREE_AT)

        unmount()
        jest.advanceTimersByTime(2 * HOUR_MS)

        expect(invalidate).not.toHaveBeenCalled()
    })
})
