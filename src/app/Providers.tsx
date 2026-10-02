'use client'

import { ApiRequestError } from '@/api/errors'
import { AuthProvider } from '@/auth/AuthContext'
import { refreshSession } from '@/auth/session'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { ANTD_THEME } from '@/design/theme'
import { ThemeProvider, useTheme } from '@/design/ThemeContext'
import { InitialScheme } from '@/design/types'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequestErrorCode } from 'adlens-shared'
import { App as AntdApp } from 'antd'
import { styleManager, ThemeProvider as StyleThemeProvider } from 'antd-style'
import { useServerInsertedHTML } from 'next/navigation'
import { ReactNode, useRef, useState } from 'react'

const MAX_QUERY_RETRIES = 2

const RETRYABLE_CODES = new Set<string>([RequestErrorCode.Unavailable, RequestErrorCode.Internal])

const isRetryable = (error: unknown) => error instanceof ApiRequestError && RETRYABLE_CODES.has(error.code)

// The session cookie expired or was revoked elsewhere: refresh the session state and ask the user to sign in again.
const handleUnauthenticated = (error: unknown) => {
    if (error instanceof ApiRequestError && error.code === RequestErrorCode.Unauthenticated) {
        refreshSession()
        useAuthModalStore.getState().setView('signin')
    }
}

const getInsertedCss = (inserted: typeof styleManager.cache.inserted, names: string[]) =>
    names
        .map((name) => inserted[name])
        .filter((rule) => typeof rule === 'string')
        .join('')

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

// <AntdRegistry> only flushes antd's own cssinjs cache. createStyles (antd-style → emotion) keeps a separate cache
// that nothing else writes into the SSR HTML, so without this every acss-* class is unstyled until hydration. The HTML
// streams in several flushes (the page body after the shell), so each flush emits the styles registered since the last.
const AntdStyleRegistry = ({ children }: { children: ReactNode }) => {
    const emitted = useRef(new Set<string>())

    useServerInsertedHTML(() => {
        const { cache } = styleManager
        const names = Object.keys(cache.inserted).filter((name) => !emitted.current.has(name))

        if (!names.length) {
            return null
        }

        names.forEach((name) => emitted.current.add(name))

        const css = getInsertedCss(cache.inserted, names)

        return (
            <style
                key={names[0]}
                data-emotion={`${cache.key} ${names.join(' ')}`}
                dangerouslySetInnerHTML={{ __html: css }}
            />
        )
    })

    return <>{children}</>
}

const ThemedShell = ({ children }: { children: ReactNode }) => {
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

export function Providers({ children, initialScheme }: IProps) {
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
