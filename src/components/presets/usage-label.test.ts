import { formatUsage } from './usage-label'

describe('formatUsage', () => {
    it('says a preset no analysis has run with is not used', () => {
        expect(formatUsage(0)).toBe('Not used')
    })

    it('counts the runs, with the singular for one', () => {
        expect(formatUsage(1)).toBe('Used 1 time')
        expect(formatUsage(3)).toBe('Used 3 times')
    })
})
