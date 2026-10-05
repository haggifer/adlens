import { readAccountKind, rememberAccountKind } from '@/auth/account-kind-snapshot'
import { AccountKind } from '@/auth/types'

const SNAPSHOT_KEY = 'adlens_account_kind'

describe('account kind snapshot', () => {
    afterEach(() => {
        jest.restoreAllMocks()
        localStorage.clear()
    })

    it('remembers only the kind of account, and reads it back', () => {
        rememberAccountKind(AccountKind.Unconfirmed)

        expect(localStorage.getItem(SNAPSHOT_KEY)).toBe('unconfirmed')
        expect(readAccountKind()).toBe(AccountKind.Unconfirmed)
    })

    it('forgets the kind when there is no session', () => {
        rememberAccountKind(AccountKind.Member)
        rememberAccountKind(null)

        expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull()
        expect(readAccountKind()).toBeNull()
    })

    it('ignores a value it doesn’t know', () => {
        localStorage.setItem(SNAPSHOT_KEY, 'superuser')

        expect(readAccountKind()).toBeNull()
    })

    it('carries on without a snapshot when storage is blocked', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError')
        })
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('blocked', 'SecurityError')
        })

        expect(() => rememberAccountKind(AccountKind.Member)).not.toThrow()
        expect(readAccountKind()).toBeNull()
    })
})
