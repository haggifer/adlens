import { AccountKind } from '@/auth/types'

// The kind of account this browser's last session had, so the header can draw its shape before the session loads.
// Only the kind is kept: never an email, name or id, and never anything per-user data could be read with.
const SNAPSHOT_KEY = 'adlens_account_kind'

const ACCOUNT_KINDS = new Set<string>(Object.values(AccountKind))

const isAccountKind = (value: string | null): value is AccountKind => value !== null && ACCOUNT_KINDS.has(value)

// Storage throws when the browser blocks it (some private modes, disabled site data); the header then waits instead.
export const readAccountKind = (): AccountKind | null => {
    try {
        const value = localStorage.getItem(SNAPSHOT_KEY)

        return isAccountKind(value) ? value : null
    } catch {
        return null
    }
}

export const rememberAccountKind = (kind: AccountKind | null) => {
    try {
        if (kind) {
            localStorage.setItem(SNAPSHOT_KEY, kind)
            return
        }

        localStorage.removeItem(SNAPSHOT_KEY)
    } catch {
        // Without storage the next load simply shows the placeholder.
    }
}
