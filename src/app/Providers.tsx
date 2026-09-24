'use client'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequestErrorCode } from 'adlens-shared'
import { App as AntdApp } from 'antd'
import { extractStaticStyle, ThemeProvider as StyleThemeProvider } from 'antd-style'
import { useServerInsertedHTML } from 'next/navigation'
import { ReactNode, useRef, useState } from 'react'
import { ApiRequestError } from '@/api/errors'
import { authClient } from '@/auth/authClient'
import AuthProvider from '@/auth/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { InitialScheme } from '@/design/scheme-cookie'
import { ANTD_THEME } from '@/design/theme'
import ThemeProvider, { useTheme } from '@/design/ThemeContext'

const MAX_QUERY_RETRIES = 2

const RETRYABLE_CODES = new Set<string>([RequestErrorCode.Unavailable, RequestErrorCode.Internal])

const isRetryable = (error: unknown) => error instanceof ApiRequestError && RETRYABLE_CODES.has(error.code)

// The session cookie expired or was revoked elsewhere: refresh the session state and ask the user to sign in again.
const handleUnauthenticated = (error: unknown) => {
    if (error instanceof ApiRequestError && error.code === RequestErrorCode.Unauthenticated) {
        authClient.$store.notify('$sessionSignal')
        useAuthModalStore.getState().setView('signin')
    }
}

const createQueryClient = () =>
    new QueryClient({
        queryCache: new QueryCache({ onError: handleUnauthenticated }),
        mutationCache: new MutationCache({ onError: handleUnauthenticated }),
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => failureCount < MAX_QUERY_RETRIES && isRetryable(error),
                refetchOnWindowFocus: false,
            },
        },
    })

interface IChildrenProps {
    children: ReactNode
}

// <AntdRegistry> only flushes antd's own cssinjs cache. createStyles (antd-style → emotion) keeps a separate cache
// that nothing else writes into the SSR HTML, so without this every acss-* class is unstyled until hydration.
const AntdStyleRegistry = ({ children }: IChildrenProps) => {
    const isInserted = useRef(false)

    useServerInsertedHTML(() => {
        if (isInserted.current) return null

        isInserted.current = true

        return <>{extractStaticStyle(undefined, { includeAntd: false }).map((item) => item.style)}</>
    })

    return <>{children}</>
}

const ThemedShell = ({ children }: IChildrenProps) => {
    const { scheme } = useTheme()

    // antd-style's ThemeProvider renders the antd ConfigProvider internally: `appearance` selects the
    // light/dark algorithm AND feeds createStyles' `isDarkMode`, keeping tokens and isDarkMode in sync.
    return (
        <StyleThemeProvider appearance={scheme} theme={ANTD_THEME}>
            <AntdApp>
                <AuthProvider>
                    <AppShell>{children}</AppShell>
                </AuthProvider>
            </AntdApp>
        </StyleThemeProvider>
    )
}

interface IProps {
    children: ReactNode
    initialScheme: InitialScheme
}

export default function Providers({ children, initialScheme }: IProps) {
    const [queryClient] = useState(createQueryClient)

    return (
        <AntdRegistry>
            <AntdStyleRegistry>
                <ThemeProvider initial={initialScheme}>
                    <QueryClientProvider client={queryClient}>
                        <ThemedShell>{children}</ThemedShell>
                    </QueryClientProvider>
                </ThemeProvider>
            </AntdStyleRegistry>
        </AntdRegistry>
    )
}
