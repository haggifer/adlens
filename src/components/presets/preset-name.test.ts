import { isSameName } from './preset-name'

describe('isSameName', () => {
    it('treats names as one regardless of case, outer spaces, inner runs of spaces and Unicode form', () => {
        expect(isSameName('Summer Sale', ' summer   sale ')).toBe(true)
        expect(isSameName('Summer Sale', 'Ｓｕｍｍｅｒ Sale')).toBe(true)
        expect(isSameName('Summer\tSale', 'summer sale')).toBe(true)
    })

    it('tells different names apart', () => {
        expect(isSameName('Summer Sale', 'SummerSale')).toBe(false)
        expect(isSameName('Summer Sale', 'Summer Sale 2')).toBe(false)
    })
})
