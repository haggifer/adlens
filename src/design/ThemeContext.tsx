'use client'

import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { writeSchemeCookie } from '@/design/scheme-cookie'
import { ColorScheme } from '@/design/types'

interface ThemeContextValue {
    scheme: ColorScheme
    setScheme: (scheme: ColorScheme) => void
    isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface IProps {
    children: ReactNode
    initialScheme: ColorScheme
}

export default function ThemeProvider({ children, initialScheme }: IProps) {
    // Seeded from the SSR cookie, so the server and first client render already agree — no flash.
    const [scheme, setSchemeState] = useState<ColorScheme>(initialScheme)

    const value = useMemo<ThemeContextValue>(
        () => ({
            scheme,
            setScheme: (next) => {
                document.documentElement.dataset.scheme = next
                document.documentElement.style.colorScheme = next
                writeSchemeCookie(next)
                setSchemeState(next)
            },
            isDark: scheme === 'dark',
        }),
        [scheme],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }

    return context
}
