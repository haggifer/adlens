import { formatCount } from './results'

describe('formatCount', () => {
    it('uses the singular for exactly one', () => {
        expect(formatCount(1, 'blocker', 'blockers')).toBe('1 blocker')
    })

    it('uses the plural otherwise', () => {
        expect(formatCount(0, 'blocker', 'blockers')).toBe('0 blockers')
        expect(formatCount(3, 'warning', 'warnings')).toBe('3 warnings')
    })
})
