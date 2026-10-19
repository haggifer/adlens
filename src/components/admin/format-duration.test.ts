import { formatMs } from './format-duration'

describe('formatMs', () => {
    it('shows milliseconds below a second, rounded', () => {
        expect(formatMs(0)).toBe('0 ms')
        expect(formatMs(412.6)).toBe('413 ms')
    })

    it('shows seconds with one decimal from a second up', () => {
        expect(formatMs(1000)).toBe('1.0 s')
        expect(formatMs(12_345)).toBe('12.3 s')
    })
})
