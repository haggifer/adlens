'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { signOut as signOutRequest, useSession } from '@/auth/authClient'

export interface AuthUser {
    id: string
    email: string
    name: string
}

export interface AuthContextValue {
    isInitializing: boolean
    isSignedIn: boolean
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

        return {
            isInitializing: isPending,
            isSignedIn: Boolean(user),
            user: user ? { id: user.id, email: user.email, name: user.name } : null,
            // Cached server data belongs to the signed-in user, so it goes with the session.
            signOut: async () => {
                await signOutRequest()
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
