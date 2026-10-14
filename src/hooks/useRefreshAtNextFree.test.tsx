import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useRefreshAtNextFree } from './useRefreshAtNextFree'

const NOW = new Date('2026-10-14T12:00:00.000Z')

const NEXT_FREE_AT = '2026-10-14T13:00:00.000Z'

const HOUR_MS = 60 * 60 * 1000

const MINUTE_MS = 60 * 1000

// Each refresh asks for the quota and the admission answer.
const countRefreshes = (invalidate: jest.SpyInstance) =>
    invalidate.mock.calls.filter(([filters]) => filters.queryKey[0] === 'quota').length

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

    // A client clock ahead of the API's asks before the API frees the analysis, and gets the same moment back.
    it('asks again a few times, further apart, while the answer still names the same moment', () => {
        const { invalidate } = renderRefresh(NEXT_FREE_AT)

        jest.advanceTimersByTime(HOUR_MS + 10_000)

        expect(countRefreshes(invalidate)).toBe(1)

        jest.advanceTimersByTime(30_000)

        expect(countRefreshes(invalidate)).toBe(2)

        jest.advanceTimersByTime(MINUTE_MS + 2 * MINUTE_MS)

        expect(countRefreshes(invalidate)).toBe(4)

        jest.advanceTimersByTime(HOUR_MS)

        expect(countRefreshes(invalidate)).toBe(4)
    })

    it('stops asking once a new answer names another moment, and waits for that one', () => {
        const { invalidate, rerender } = renderRefresh(NEXT_FREE_AT)

        jest.advanceTimersByTime(HOUR_MS + 10_000)
        rerender({ at: '2026-10-14T15:00:00.000Z' })
        jest.advanceTimersByTime(30 * MINUTE_MS)

        expect(countRefreshes(invalidate)).toBe(1)

        jest.advanceTimersByTime(HOUR_MS + 30 * MINUTE_MS)

        expect(countRefreshes(invalidate)).toBe(2)
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
