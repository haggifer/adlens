import { formatQuotaDate, formatQuotaLeft, getQuotaResetDate } from './quota-label'

describe('formatQuotaLeft', () => {
    it('shows the analyses left out of the limit', () => {
        expect(formatQuotaLeft({ used: 1, limit: 3, nextFreeAt: null })).toBe('2/3 analyses left')
        expect(formatQuotaLeft({ used: 3, limit: 3, nextFreeAt: null })).toBe('0/3 analyses left')
    })

    // A lowered limit, or an admin's uncapped runs once the account is no longer an admin, can leave more charged runs
    // in the window than the limit.
    it('never shows a negative count when more runs were charged than the limit allows', () => {
        expect(formatQuotaLeft({ used: 5, limit: 3, nextFreeAt: null })).toBe('0/3 analyses left')
    })

    it('says unlimited when there is no limit', () => {
        expect(formatQuotaLeft({ used: 40, limit: null, nextFreeAt: null })).toBe('Unlimited analyses')
    })
})

describe('getQuotaResetDate', () => {
    it('gives the moment the oldest counted analysis stops counting', () => {
        const quota = { used: 1, limit: 3, nextFreeAt: '2026-10-16T09:30:00.000Z' }

        expect(getQuotaResetDate(quota)).toBe(formatQuotaDate('2026-10-16T09:30:00.000Z'))
    })

    it('is null while no analysis counts', () => {
        expect(getQuotaResetDate({ used: 0, limit: 3, nextFreeAt: null })).toBeNull()
    })

    it('is null for an admin, whose runs are never capped', () => {
        expect(getQuotaResetDate({ used: 4, limit: null, nextFreeAt: '2026-10-16T09:30:00.000Z' })).toBeNull()
    })
})

describe('formatQuotaDate', () => {
    it('writes the date in English, with a 24-hour time, whatever the browser’s language', () => {
        expect(formatQuotaDate('2026-10-16T09:30:00.000Z')).toMatch(/^Oct 1[56] \d{2}:\d{2}$/)
    })
})
