'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import { ThemeProvider as StyleThemeProvider } from 'antd-style'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import AuthUiProvider from '@/lib/auth/AuthUiContext'
import HarnessProvider, { useHarness } from '@/lib/design/harness/HarnessContext'
import { HarnessSettings } from '@/lib/design/harness/harness-cookie'
import { buildAntdTheme } from '@/lib/design/theme'
import ThemeProvider, { useTheme } from '@/lib/design/ThemeContext'
import { ColorScheme } from '@/lib/design/types'
import { getFirebaseAnalytics } from '@/lib/firebase/config'

interface IProps {
    children: ReactNode
}

interface ProvidersProps extends IProps {
    initialScheme: ColorScheme
    initialSettings: HarnessSettings
}

const ThemedShell = ({ children }: IProps) => {
    const { scheme } = useTheme()
    // Harness override; falls back to the locked brand primary in production.
    const { primaryColor } = useHarness()

    const theme = useMemo(() => buildAntdTheme(primaryColor), [primaryColor])

    // antd-style's ThemeProvider renders the antd ConfigProvider internally: `appearance` selects the
    // light/dark algorithm AND feeds createStyles' `isDarkMode`, keeping tokens and isDarkMode in sync.
    return (
        <StyleThemeProvider appearance={scheme} theme={theme}>
            <AntdApp>
                <AuthUiProvider>
                    <AppShell>{children}</AppShell>
                </AuthUiProvider>
            </AntdApp>
        </StyleThemeProvider>
    )
}

export default function Providers({ children, initialScheme, initialSettings }: ProvidersProps) {
    const [queryClient] = useState(() => new QueryClient())

    useEffect(() => {
        void getFirebaseAnalytics()
    }, [])

    return (
        <AntdRegistry>
            <ThemeProvider initialScheme={initialScheme}>
                {/* TEMPORARY: design harness. Remove <HarnessProvider> (and <DevBar/>) to strip it. */}
                <HarnessProvider initialSettings={initialSettings}>
                    <QueryClientProvider client={queryClient}>
                        <ThemedShell>{children}</ThemedShell>
                    </QueryClientProvider>
                </HarnessProvider>
            </ThemeProvider>
        </AntdRegistry>
    )
}
