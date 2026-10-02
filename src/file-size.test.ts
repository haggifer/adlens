import { toMegabytes } from '@/file-size'

describe('toMegabytes', () => {
    it('counts decimal megabytes', () => {
        expect(toMegabytes(5 * 1000 * 1000)).toBe(5)
        expect(toMegabytes(1500 * 1000)).toBe(1.5)
    })
})
