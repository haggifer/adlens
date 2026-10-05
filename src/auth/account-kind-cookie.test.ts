import {
    ACCOUNT_KIND_COOKIE,
    getAccountKindCookie,
    parseAccountKind,
    writeAccountKindCookie,
} from '@/auth/account-kind-cookie'
import { AccountKind } from '@/auth/types'

describe('parseAccountKind', () => {
    it.each(Object.values(AccountKind))('reads the kind %s', (kind) => {
        expect(parseAccountKind(kind)).toBe(kind)
    })

    it('reads nothing when there is no cookie', () => {
        expect(parseAccountKind(undefined)).toBeNull()
    })

    it('ignores a value it doesn’t know', () => {
        expect(parseAccountKind('superuser')).toBeNull()
        expect(parseAccountKind('')).toBeNull()
    })
})

describe('getAccountKindCookie', () => {
    it('keeps the kind for a year on this host only, sent with same-site requests', () => {
        expect(getAccountKindCookie(AccountKind.Member, false)).toBe(
            `${ACCOUNT_KIND_COOKIE}=member; path=/; max-age=31536000; samesite=lax`,
        )
    })

    it('expires the cookie at once when there is no kind to keep', () => {
        expect(getAccountKindCookie(null, false)).toBe(`${ACCOUNT_KIND_COOKIE}=; path=/; max-age=0; samesite=lax`)
    })

    it('is sent only over HTTPS when the page is served over HTTPS', () => {
        expect(getAccountKindCookie(AccountKind.Anonymous, true)).toBe(
            `${ACCOUNT_KIND_COOKIE}=anonymous; path=/; max-age=31536000; samesite=lax; secure`,
        )
        expect(getAccountKindCookie(null, true)).toBe(
            `${ACCOUNT_KIND_COOKIE}=; path=/; max-age=0; samesite=lax; secure`,
        )
    })
})

describe('writeAccountKindCookie', () => {
    afterEach(() => {
        document.cookie = `${ACCOUNT_KIND_COOKIE}=; max-age=0; path=/`
    })

    it('remembers only the kind of account, in the cookie the root layout reads', () => {
        writeAccountKindCookie(AccountKind.Unconfirmed)

        expect(document.cookie).toBe(`${ACCOUNT_KIND_COOKIE}=unconfirmed`)
    })

    it('forgets the kind when there is no session', () => {
        writeAccountKindCookie(AccountKind.Member)
        writeAccountKindCookie(null)

        expect(document.cookie).toBe('')
    })
})
