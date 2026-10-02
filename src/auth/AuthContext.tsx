'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { readAccountKind, rememberAccountKind } from '@/auth/account-kind-snapshot'
import { signOut as signOutRequest, useSession } from '@/auth/authClient'
import { runAuthRequest } from '@/auth/errors'
import { AccountKind } from '@/auth/types'

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
    // While initializing, the kind this browser's last session had (null if none), so the header can show its shape
    // before the session loads; null once it has. Never use it to load per-user data.
    snapshotKind: AccountKind | null
    // Rejects with an AuthError (describeError gives its copy) on a refused or unreachable sign-out; clears the
    // query cache only once it succeeds.
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface IProps {
    children: ReactNode
}

interface SessionAccount {
    userId: string | null
    isEmailConfirmed: boolean
}

interface SessionUser {
    isAnonymous?: boolean | null
    emailVerified: boolean
    isAdmin?: boolean | null
}

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

// The snapshot is only read, never watched: this tab writes it itself, and only once its session has loaded.
const subscribeToNothing = () => () => {}

// The server has no storage, so the first render (and hydration) shows no snapshot; the browser's follows at once.
const getServerAccountKind = () => null

export function AuthProvider({ children }: IProps) {
    const queryClient = useQueryClient()
    const { data: session, isPending, error } = useSession()
    const rememberedKind = useSyncExternalStore(subscribeToNothing, readAccountKind, getServerAccountKind)
    // The account the session last resolved to, null until it first has, to tell a change from the first load.
    const lastAccount = useRef<SessionAccount | null>(null)
    const userId = session?.user.id ?? null
    const accountKind = getAccountKind(session?.user)
    const isEmailConfirmed = accountKind === AccountKind.Member || accountKind === AccountKind.Admin

    // A failed session request says nothing about the account, so it keeps the snapshot.
    useEffect(() => {
        if (!isPending && !error) {
            rememberAccountKind(accountKind)
        }
    }, [isPending, error, accountKind])

    // The session can change under the page: a sign-in, a confirmation, or another tab (Better Auth tells this one).
    // Per-user data is keyed by the user id, but a quota cached for that id still carries the old limits, and an
    // account's history cached earlier in this tab misses what an anonymous session just moved into it.
    useEffect(() => {
        if (isPending) {
            return
        }

        const previous = lastAccount.current

        lastAccount.current = { userId, isEmailConfirmed }

        if (!previous) {
            return
        }

        if (previous.userId !== userId) {
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
            void queryClient.invalidateQueries({ queryKey: ['jobs'] })
            return
        }

        if (previous.isEmailConfirmed !== isEmailConfirmed) {
            void queryClient.invalidateQueries({ queryKey: ['quota'] })
        }
    }, [isPending, userId, isEmailConfirmed, queryClient])

    const value = useMemo<AuthContextValue>(() => {
        const user = session?.user
        const isAnonymous = accountKind === AccountKind.Anonymous

        return {
            isInitializing: isPending,
            isSignedIn: Boolean(user),
            isAnonymous,
            isEmailConfirmed,
            user: user ? { id: user.id, email: isAnonymous ? null : user.email, name: user.name } : null,
            accountKind,
            snapshotKind: isPending ? rememberedKind : null,
            // Cached server data belongs to the signed-in user, so it goes with the session. A refused or
            // unreachable sign-out must not clear it or leave the caller thinking the user is signed out.
            signOut: async () => {
                const error = await runAuthRequest(() => signOutRequest())

                if (error) {
                    throw error
                }

                queryClient.clear()
                rememberAccountKind(null)
            },
        }
    }, [session, isPending, accountKind, isEmailConfirmed, rememberedKind, queryClient])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}
