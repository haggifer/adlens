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

    return { user: userEvent.setup(), queryClient, ...render<typeof queries>(ui, { wrapper }) }
}
