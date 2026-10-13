import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type queries, render, type RenderResult } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { App } from 'antd'
import type { ReactElement, ReactNode } from 'react'

// TanStack Query retries a failed query three times with a back-off, which would hold an error state back for seconds.
export const createTestQueryClient = (): QueryClient =>
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

export interface RenderWithProvidersResult extends RenderResult {
    user: UserEvent
    queryClient: QueryClient
}

// The providers every page has: the query cache, and antd's App for the modal and notification hooks.
export const renderWithProviders = (
    ui: ReactElement,
    queryClient: QueryClient = createTestQueryClient(),
): RenderWithProvidersResult => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <App>{children}</App>
        </QueryClientProvider>
    )

    // user-event's pointer-events check reads computed styles up the tree on every click and keystroke, which antd's
    // injected CSS makes slow in jsdom (a test that opens a confirm took twice as long).
    return { user: userEvent.setup({ pointerEventsCheck: 0 }), queryClient, ...render<typeof queries>(ui, { wrapper }) }
}
