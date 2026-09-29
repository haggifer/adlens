'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { signOut as signOutRequest, useSession } from '@/auth/authClient'
import { runAuthRequest } from '@/auth/errors'

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
    user: AuthUser | null
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface IProps {
    children: ReactNode
}

export function AuthProvider({ children }: IProps) {
    const queryClient = useQueryClient()
    const { data: session, isPending } = useSession()

    const value = useMemo<AuthContextValue>(() => {
        const user = session?.user
        const isAnonymous = Boolean(user?.isAnonymous)

        return {
            isInitializing: isPending,
            isSignedIn: Boolean(user),
            isAnonymous,
            user: user ? { id: user.id, email: isAnonymous ? null : user.email, name: user.name } : null,
            // Cached server data belongs to the signed-in user, so it goes with the session. A refused or
            // unreachable sign-out must not clear it or leave the caller thinking the user is signed out.
            signOut: async () => {
                const error = await runAuthRequest(() => signOutRequest())

                if (error) {
                    throw error
                }

                queryClient.clear()
            },
        }
    }, [session, isPending, queryClient])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}
