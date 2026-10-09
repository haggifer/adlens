'use client'

import { isConfirmedKind } from '@/auth/account-kind'
import { writeAccountKindCookie } from '@/auth/account-kind-cookie'
import { signOut as signOutRequest, useSession } from '@/auth/authClient'
import { runAuthRequest } from '@/auth/errors'
import { AccountKind } from '@/auth/types'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

export interface AuthUser {
    id: string
    // null for an anonymous user: their address is Better Auth's placeholder and must never be shown.
    email: string | null
    name: string
}

export interface AuthContextValue {
    isInitializing: boolean
    // Any session, anonymous ones included, so their history, quota and live updates work unchanged.
    isSignedIn: boolean
    isAnonymous: boolean
    // A non-anonymous account whose email is confirmed. Until then an account is limited like an anonymous session
    // (one analysis, no account page), so account-only UI checks this rather than isAnonymous.
    isEmailConfirmed: boolean
    user: AuthUser | null
    // null when signed out or still initializing.
    accountKind: AccountKind | null
    // While initializing, the kind this browser's last session had (null if none), as the server read it from the
    // cookie, so the header can show its shape before the session loads; null once it has. Never use it to load
    // per-user data.
    snapshotKind: AccountKind | null
    // Rejects with an AuthError (describeError gives its copy) on a refused or unreachable sign-out; clears the
    // query cache only once it succeeds.
    signOut: () => Promise<void>
}

interface SessionAccount {
    userId: string | null
    isEmailConfirmed: boolean
}

interface SessionUser {
    id: string
    email: string
    name: string
    isAnonymous?: boolean | null
    emailVerified: boolean
    isAdmin?: boolean | null
}

interface AuthState {
    user: SessionUser | undefined
    isInitializing: boolean
    accountKind: AccountKind | null
    isEmailConfirmed: boolean
    snapshotKind: AccountKind | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const getAccountKind = (user: SessionUser | undefined): AccountKind | null => {
    if (!user) {
        return null
    }

    if (user.isAnonymous) {
        return AccountKind.Anonymous
    }

    if (!user.emailVerified) {
        return AccountKind.Unconfirmed
    }

    return user.isAdmin ? AccountKind.Admin : AccountKind.Member
}

// Cached server data belongs to the signed-in user, so it goes with the session. A refused or unreachable sign-out
// must not clear it or leave the caller thinking the user is signed out.
const signOutAndClear = async (queryClient: QueryClient) => {
    const error = await runAuthRequest(() => signOutRequest())

    if (error) {
        throw error
    }

    queryClient.clear()
    writeAccountKindCookie(null)
}

const createAuthValue = (
    { user, isInitializing, accountKind, isEmailConfirmed, snapshotKind }: AuthState,
    queryClient: QueryClient,
): AuthContextValue => {
    const isAnonymous = accountKind === AccountKind.Anonymous

    return {
        isInitializing,
        isSignedIn: Boolean(user),
        isAnonymous,
        isEmailConfirmed,
        user: user ? { id: user.id, email: isAnonymous ? null : user.email, name: user.name } : null,
        accountKind,
        snapshotKind,
        signOut: () => signOutAndClear(queryClient),
    }
}

// Per-user data is keyed by the user id, but a quota cached for that id still carries the old limits, and an
// account's history cached earlier in this tab misses what an anonymous session just moved into it.
const invalidateChangedAccount = (queryClient: QueryClient, previous: SessionAccount, current: SessionAccount) => {
    if (previous.userId !== current.userId) {
        void queryClient.invalidateQueries({ queryKey: ['quota'] })
        void queryClient.invalidateQueries({ queryKey: ['jobs'] })
        return
    }

    // The admission answer is cached under the same user id, so without this Run stayed refused ("Confirm your email")
    // after the confirmation while the header's quota had already updated.
    if (previous.isEmailConfirmed !== current.isEmailConfirmed) {
        void queryClient.invalidateQueries({ queryKey: ['quota'] })
        void queryClient.invalidateQueries({ queryKey: ['admission'] })
    }
}

interface IProps {
    children: ReactNode
    // The kind the root layout read from the cookie, so the server's HTML and hydration draw the same header.
    initialKind: AccountKind | null
}

export function AuthProvider({ children, initialKind }: IProps) {
    const queryClient = useQueryClient()

    // The account the session last resolved to, null until it first has, to tell a change from the first load.
    const lastAccount = useRef<SessionAccount | null>(null)
    // Better Auth reports every fetch with no session in hand as pending (each return to the tab, each refresh), so
    // only the first one is the page still initializing; the others keep the signed-out state already shown.
    const [hasLoaded, setHasLoaded] = useState(false)

    const { data: session, isPending, error } = useSession()

    if (!isPending && !hasLoaded) {
        setHasLoaded(true)
    }

    const user = session?.user
    const userId = user?.id ?? null
    const accountKind = getAccountKind(user)
    const isEmailConfirmed = isConfirmedKind(accountKind)
    const isInitializing = isPending && !hasLoaded
    // The page-load cookie describes only the session before its first load, never a later one.
    const snapshotKind = isInitializing ? initialKind : null
    const value = useMemo(
        () => createAuthValue({ user, isInitializing, accountKind, isEmailConfirmed, snapshotKind }, queryClient),
        [user, isInitializing, accountKind, isEmailConfirmed, snapshotKind, queryClient],
    )

    // A failed session request says nothing about the account, so it keeps the snapshot.
    useEffect(() => {
        if (!isPending && !error) {
            writeAccountKindCookie(accountKind)
        }
    }, [isPending, error, accountKind])

    // The session can change under the page: a sign-in, a confirmation, or another tab (Better Auth tells this one).
    useEffect(() => {
        if (isPending) {
            return
        }

        const previous = lastAccount.current
        const current = { userId, isEmailConfirmed }

        lastAccount.current = current

        if (previous) {
            invalidateChangedAccount(queryClient, previous, current)
        }
    }, [isPending, userId, isEmailConfirmed, queryClient])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}
