import { AccountKind } from '@/auth/types'

// The kind of account this browser's last session had, so the server can draw the header's shape before the session
// loads. Only the kind is kept: never an email, name or id, and never anything per-user data could be read with.
// It only shapes the first paint and is never trusted for access or data: the session decides those.
export const ACCOUNT_KIND_COOKIE = 'adlens_account_kind'

const ONE_YEAR_S = 31_536_000

const ACCOUNT_KINDS = new Set<string>(Object.values(AccountKind))

const isAccountKind = (value?: string): value is AccountKind => value !== undefined && ACCOUNT_KINDS.has(value)

export const parseAccountKind = (cookieValue?: string): AccountKind | null =>
    isAccountKind(cookieValue) ? cookieValue : null

// Host-only (no Domain), so it never reaches the API's host. Secure only over HTTPS, so local HTTP development keeps it.
export const getAccountKindCookie = (kind: AccountKind | null, isSecure: boolean) => {
    const value = kind ?? ''
    const maxAge = kind ? ONE_YEAR_S : 0
    const secure = isSecure ? '; secure' : ''

    return `${ACCOUNT_KIND_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax${secure}`
}

export const writeAccountKindCookie = (kind: AccountKind | null) => {
    document.cookie = getAccountKindCookie(kind, location.protocol === 'https:')
}
