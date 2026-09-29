import { formatQuotaLeft } from './quota-label'

describe('formatQuotaLeft', () => {
    it('shows the analyses left out of the limit', () => {
        expect(formatQuotaLeft({ used: 1, limit: 3, nextFreeAt: null })).toBe('2/3 analyses left')
        expect(formatQuotaLeft({ used: 3, limit: 3, nextFreeAt: null })).toBe('0/3 analyses left')
    })

    // An account moved to a smaller plan can have more charged runs in the window than its new limit.
    it('never shows a negative count when more runs were charged than the limit allows', () => {
        expect(formatQuotaLeft({ used: 5, limit: 3, nextFreeAt: null })).toBe('0/3 analyses left')
    })

    it('says unlimited when there is no limit', () => {
        expect(formatQuotaLeft({ used: 40, limit: null, nextFreeAt: null })).toBe('Unlimited analyses')
    })
})
