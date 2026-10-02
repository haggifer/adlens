'use client'

import { SYSTEM_DARK_QUERY, writeSchemeCookie } from '@/design/scheme-cookie'
import { ColorScheme, InitialScheme } from '@/design/types'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

interface ThemeContextValue {
    scheme: ColorScheme
    setScheme: (scheme: ColorScheme) => void
    isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const applyToDocument = (scheme: ColorScheme) => {
    document.documentElement.dataset.scheme = scheme
    document.documentElement.style.colorScheme = scheme
}

const createThemeValue = (
    scheme: ColorScheme,
    setIsStored: (isStored: boolean) => void,
    setSchemeState: (scheme: ColorScheme) => void,
): ThemeContextValue => ({
    scheme,
    setScheme: (next) => {
        applyToDocument(next)
        writeSchemeCookie(next)
        setIsStored(true)
        setSchemeState(next)
    },
    isDark: scheme === 'dark',
})

interface IProps {
    children: ReactNode
    initial: InitialScheme
}

export function ThemeProvider({ children, initial }: IProps) {
    // Seeded from what the server rendered (cookie, or the system-preference client hint), so the first client render
    // matches the HTML.
    const [scheme, setSchemeState] = useState<ColorScheme>(initial.scheme)
    const [isStored, setIsStored] = useState(initial.isStored)

    const value = useMemo(() => createThemeValue(scheme, setIsStored, setSchemeState), [scheme])

    // Until the user picks a scheme, follow the system: browsers without the client hint were rendered with the
    // fallback, and the system setting can change while the page is open.
    useEffect(() => {
        if (isStored) {
            return
        }

        const query = window.matchMedia(SYSTEM_DARK_QUERY)
        const follow = () => {
            const system: ColorScheme = query.matches ? 'dark' : 'light'

            applyToDocument(system)
            setSchemeState(system)
        }

        follow()
        query.addEventListener('change', follow)

        return () => query.removeEventListener('change', follow)
    }, [isStored])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }

    return context
}
