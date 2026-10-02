import { checkEmailConfirmed } from '@/auth/account-kind'
import { AccountKind } from '@/auth/types'

describe('checkEmailConfirmed', () => {
    it.each([AccountKind.Member, AccountKind.Admin])('is true for a %s account', (kind) => {
        expect(checkEmailConfirmed(kind)).toBe(true)
    })

    it.each([AccountKind.Anonymous, AccountKind.Unconfirmed, null])('is false for %s', (kind) => {
        expect(checkEmailConfirmed(kind)).toBe(false)
    })
})
