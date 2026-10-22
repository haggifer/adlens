import type { AuthContextValue, AuthUser } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'

export const MEMBER_EMAIL = 'ann@example.com'

export const MEMBER_USER: AuthUser = { id: 'member-1', email: MEMBER_EMAIL, name: 'Ann' }

// AuthContext hides an anonymous user's placeholder address, so the UI only ever sees null.
const ANONYMOUS_USER: AuthUser = { id: 'anon-1', email: null, name: 'Anonymous' }

const createAuth = (overrides: Partial<AuthContextValue>): AuthContextValue => ({
    isInitializing: false,
    isSignedIn: false,
    isAnonymous: false,
    isEmailConfirmed: false,
    user: null,
    accountKind: null,
    snapshotKind: null,
    signOut: jest.fn(async () => undefined),
    ...overrides,
})

// While the session loads, the header draws the kind of account this browser last had, if it remembers one.
export const initializingAuth = (snapshotKind: AccountKind | null = null): AuthContextValue =>
    createAuth({ isInitializing: true, snapshotKind })

export const signedOutAuth = (): AuthContextValue => createAuth({})

export const anonymousAuth = (): AuthContextValue =>
    createAuth({ isSignedIn: true, isAnonymous: true, user: ANONYMOUS_USER, accountKind: AccountKind.Anonymous })

export const unconfirmedAuth = (): AuthContextValue =>
    createAuth({ isSignedIn: true, user: MEMBER_USER, accountKind: AccountKind.Unconfirmed })

export const memberAuth = (): AuthContextValue =>
    createAuth({ isSignedIn: true, isEmailConfirmed: true, user: MEMBER_USER, accountKind: AccountKind.Member })

export const adminAuth = (): AuthContextValue =>
    createAuth({ isSignedIn: true, isEmailConfirmed: true, user: MEMBER_USER, accountKind: AccountKind.Admin })
