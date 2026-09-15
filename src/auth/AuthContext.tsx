'use client'

import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { useSession } from '@/auth/authClient'

export type AuthView = 'signin' | 'signup' | 'forgot'

export interface AuthUser {
    id: string
    email: string
    name?: string
    image?: string | null
}

export interface AuthContextValue {
    initializing: boolean
    isSignedIn: boolean
    uid: string | null
    user: AuthUser | null
    view: AuthView | null
    openAuth: (view: AuthView) => void
    closeAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface IProps {
    children: ReactNode
}

export default function AuthProvider({ children }: IProps) {
    const [view, setView] = useState<AuthView | null>(null)
    const { data: session, isPending } = useSession()

    const value = useMemo<AuthContextValue>(() => {
        const u = session?.user

        return {
            initializing: isPending,
            isSignedIn: Boolean(u),
            uid: u?.id ?? null,
            user: u ? { id: u.id, email: u.email, name: u.name ?? undefined, image: u.image ?? null } : null,
            view,
            openAuth: (next) => setView(next),
            closeAuth: () => setView(null),
        }
    }, [session, isPending, view])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}
