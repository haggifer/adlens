import type { AuthContextValue, AuthUser } from '@/auth/AuthContext'

export const MEMBER_EMAIL = 'ann@example.com'

export const MEMBER_USER: AuthUser = { id: 'member-1', email: MEMBER_EMAIL, name: 'Ann' }

// AuthContext hides an anonymous user's placeholder address, so the UI only ever sees null.
export const ANONYMOUS_USER: AuthUser = { id: 'anon-1', email: null, name: 'Anonymous' }

const createAuth = (overrides: Partial<AuthContextValue>): AuthContextValue => ({
    isInitializing: false,
    isSignedIn: false,
    isAnonymous: false,
    isEmailConfirmed: false,
    user: null,
    signOut: jest.fn(async () => undefined),
    ...overrides,
})

export const initializingAuth = (): AuthContextValue => createAuth({ isInitializing: true })

export const signedOutAuth = (): AuthContextValue => createAuth({})

export const anonymousAuth = (): AuthContextValue =>
    createAuth({ isSignedIn: true, isAnonymous: true, user: ANONYMOUS_USER })

// Signed up with email and password, but hasn't opened the confirmation link yet.
export const unconfirmedAuth = (): AuthContextValue => createAuth({ isSignedIn: true, user: MEMBER_USER })

export const memberAuth = (): AuthContextValue =>
    createAuth({ isSignedIn: true, isEmailConfirmed: true, user: MEMBER_USER })
