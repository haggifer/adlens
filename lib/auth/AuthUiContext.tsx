'use client'

import { onAuthStateChanged, User } from 'firebase/auth'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from '@/lib/firebase/config'

export type AuthView = 'signin' | 'signup' | 'forgot'

interface AuthUiContextValue {
    // Real session state, resolved from Firebase on load. `initializing` is true until the first
    // onAuthStateChanged callback — private routes render a loading UI while it's true.
    initializing: boolean
    isSignedIn: boolean
    view: AuthView | null
    openAuth: (view: AuthView) => void
    closeAuth: () => void
    // TEMPORARY dev override — simulate the signed-in state until real sign-in flows exist.
    setSignedIn: (value: boolean) => void
}

const AuthUiContext = createContext<AuthUiContextValue | null>(null)

interface IProps {
    children: ReactNode
}

export default function AuthUiProvider({ children }: IProps) {
    const [view, setView] = useState<AuthView | null>(null)
    const [initializing, setInitializing] = useState(true)
    const [firebaseSignedIn, setFirebaseSignedIn] = useState(false)
    // TEMPORARY: dev-harness simulation of the signed-in state (no real sign-in wired yet).
    const [simSignedIn, setSimSignedIn] = useState(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            setFirebaseSignedIn(Boolean(user))
            setInitializing(false)
        })

        return unsubscribe
    }, [])

    const value = useMemo<AuthUiContextValue>(
        () => ({
            initializing,
            isSignedIn: firebaseSignedIn || simSignedIn,
            view,
            openAuth: (next) => setView(next),
            closeAuth: () => setView(null),
            setSignedIn: setSimSignedIn,
        }),
        [initializing, firebaseSignedIn, simSignedIn, view],
    )

    return <AuthUiContext.Provider value={value}>{children}</AuthUiContext.Provider>
}

export const useAuthUi = (): AuthUiContextValue => {
    const context = useContext(AuthUiContext)

    if (!context) {
        throw new Error('useAuthUi must be used within an AuthUiProvider')
    }

    return context
}
