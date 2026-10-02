import { isConfirmedKind } from '@/auth/account-kind'
import { AccountKind } from '@/auth/types'

describe('isConfirmedKind', () => {
    it.each([AccountKind.Member, AccountKind.Admin])('is true for a %s account', (kind) => {
        expect(isConfirmedKind(kind)).toBe(true)
    })

    it.each([AccountKind.Anonymous, AccountKind.Unconfirmed, null])('is false for %s', (kind) => {
        expect(isConfirmedKind(kind)).toBe(false)
    })
})
