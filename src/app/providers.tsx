'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import { extractStaticStyle, ThemeProvider as StyleThemeProvider } from 'antd-style'
import { useServerInsertedHTML } from 'next/navigation'
import { ReactNode, useMemo, useRef, useState } from 'react'
import AuthProvider from '@/auth/AuthContext'
import AppShell from '@/components/layout/AppShell'
import HarnessProvider, { useHarness } from '@/design/harness/HarnessContext'
import { HarnessSettings } from '@/design/harness/harness-cookie'
import { buildAntdTheme } from '@/design/theme'
import ThemeProvider, { useTheme } from '@/design/ThemeContext'
import { ColorScheme } from '@/design/types'

interface IProps {
    children: ReactNode
}

interface ProvidersProps extends IProps {
    initialScheme: ColorScheme
    initialSettings: HarnessSettings
}

// <AntdRegistry> only flushes antd's own cssinjs cache. createStyles (antd-style → emotion) keeps a separate cache
// that nothing else writes into the SSR HTML, so without this every acss-* class is unstyled until hydration.
const AntdStyleRegistry = ({ children }: IProps) => {
    const isInserted = useRef(false)

    useServerInsertedHTML(() => {
        if (isInserted.current) return null

        isInserted.current = true

        return <>{extractStaticStyle(undefined, { includeAntd: false }).map((item) => item.style)}</>
    })

    return <>{children}</>
}

const ThemedShell = ({ children }: IProps) => {
    const { scheme } = useTheme()
    const { primaryColor } = useHarness()

    const theme = useMemo(() => buildAntdTheme(primaryColor), [primaryColor])

    // antd-style's ThemeProvider renders the antd ConfigProvider internally: `appearance` selects the
    // light/dark algorithm AND feeds createStyles' `isDarkMode`, keeping tokens and isDarkMode in sync.
    return (
        <StyleThemeProvider appearance={scheme} theme={theme}>
            <AntdApp>
                <AuthProvider>
                    <AppShell>{children}</AppShell>
                </AuthProvider>
            </AntdApp>
        </StyleThemeProvider>
    )
}

export default function Providers({ children, initialScheme, initialSettings }: ProvidersProps) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <AntdRegistry>
            <AntdStyleRegistry>
                <ThemeProvider initialScheme={initialScheme}>
                    {/* TEMPORARY: design harness. Remove <HarnessProvider> (and <DevBar/>) to strip it. */}
                    <HarnessProvider initialSettings={initialSettings}>
                        <QueryClientProvider client={queryClient}>
                            <ThemedShell>{children}</ThemedShell>
                        </QueryClientProvider>
                    </HarnessProvider>
                </ThemeProvider>
            </AntdStyleRegistry>
        </AntdRegistry>
    )
}
