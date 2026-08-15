'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import AuthUiProvider from '@/lib/auth/AuthUiContext'
import HarnessProvider, { useHarness } from '@/lib/design/harness/HarnessContext'
import { buildAntdTheme } from '@/lib/design/theme'
import ThemeProvider, { useTheme } from '@/lib/design/ThemeContext'
import { ColorScheme } from '@/lib/design/types'
import { getFirebaseAnalytics } from '@/lib/firebase/config'

interface IProps {
    children: ReactNode
}

interface ProvidersProps extends IProps {
    initialScheme: ColorScheme
    initialPrimaryColor: string
}

const ThemedShell = ({ children }: IProps) => {
    const { scheme } = useTheme()
    // Harness override; falls back to the locked brand primary in production.
    const { primaryColor } = useHarness()

    const theme = useMemo(() => buildAntdTheme(scheme, primaryColor), [scheme, primaryColor])

    return (
        <ConfigProvider theme={theme}>
            <AntdApp>
                <AuthUiProvider>
                    <AppShell>{children}</AppShell>
                </AuthUiProvider>
            </AntdApp>
        </ConfigProvider>
    )
}

export default function Providers({ children, initialScheme, initialPrimaryColor }: ProvidersProps) {
    const [queryClient] = useState(() => new QueryClient())

    useEffect(() => {
        void getFirebaseAnalytics()
    }, [])

    return (
        <AntdRegistry>
            <ThemeProvider initialScheme={initialScheme}>
                {/* TEMPORARY: design harness. Remove <HarnessProvider> (and <DevBar/>) to strip it. */}
                <HarnessProvider initialPrimaryColor={initialPrimaryColor}>
                    <QueryClientProvider client={queryClient}>
                        <ThemedShell>{children}</ThemedShell>
                    </QueryClientProvider>
                </HarnessProvider>
            </ThemeProvider>
        </AntdRegistry>
    )
}
