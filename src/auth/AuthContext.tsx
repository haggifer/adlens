'use client'

import { onAuthStateChanged, User } from 'firebase/auth'
import { useDoc } from '@tatsuokaniwa/swr-firestore'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { getCleanData } from '@/hooks/swr-firestore/utils'
import { auth } from '@/firebase/config'

export type AuthView = 'signin' | 'signup' | 'forgot'

export interface DbUser {
    displayName?: string
    photoURL?: string
    email?: string
}

interface AuthContextValue {
    initializing: boolean
    isSignedIn: boolean
    hasFirebaseAuth: boolean
    uid: string | null
    authUser: User | null
    dbUser: DbUser | null
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
    const [initializing, setInitializing] = useState(true)
    const [authUser, setAuthUser] = useState<User | null>(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            setAuthUser(user)
            setInitializing(false)
        })

        return unsubscribe
    }, [])

    // Raw useDoc, not useDocClean: the Clean wrapper reads this very context for its auth guard, so the
    // provider can't use it without a cycle. The local authUser guard does the same job here.
    const { data: dbUserDoc } = useDoc<DbUser>(authUser ? { path: `users/${authUser.uid}` } : null)
    const dbUser = useMemo(() => (getCleanData<DbUser>(dbUserDoc) as DbUser | undefined) ?? null, [dbUserDoc])

    const value = useMemo<AuthContextValue>(
        () => ({
            initializing,
            isSignedIn: Boolean(authUser),
            hasFirebaseAuth: Boolean(authUser),
            uid: authUser?.uid ?? null,
            authUser,
            dbUser,
            view,
            openAuth: (next) => setView(next),
            closeAuth: () => setView(null),
        }),
        [initializing, authUser, dbUser, view],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}
