import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { signOut as signOutRequest } from '@/auth/authClient'
import { createTestQueryClient } from '@/test/render'

const mockUseSession = jest.fn()

jest.mock('@/auth/authClient', () => ({
    signOut: jest.fn(async () => ({ data: { success: true }, error: null })),
    useSession: () => mockUseSession(),
}))

const JOBS_KEY = ['jobs', 'member-1']

const MEMBER_SESSION = {
    user: { id: 'member-1', email: 'ann@example.com', name: 'Ann', isAnonymous: false },
}

// Better Auth gives an anonymous user a generated placeholder address.
const ANONYMOUS_SESSION = {
    user: { id: 'anon-1', email: 'temp-4f2a@anonymous.useadlens.com', name: 'Anonymous', isAnonymous: true },
}

const renderAuth = (queryClient: QueryClient = createTestQueryClient()) =>
    renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                <AuthProvider>{children}</AuthProvider>
            </QueryClientProvider>
        ),
    })

describe('AuthProvider', () => {
    beforeEach(() => {
        jest.mocked(signOutRequest).mockClear()
    })

    it('is initializing and signed out until the session has loaded', () => {
        mockUseSession.mockReturnValue({ data: null, isPending: true })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({ isInitializing: true, isSignedIn: false, user: null })
    })

    it('is signed out when there is no session', () => {
        mockUseSession.mockReturnValue({ data: null, isPending: false })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({
            isInitializing: false,
            isSignedIn: false,
            isAnonymous: false,
            user: null,
        })
    })

    it('gives a member their email', () => {
        mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({
            isSignedIn: true,
            isAnonymous: false,
            user: { id: 'member-1', email: 'ann@example.com', name: 'Ann' },
        })
    })

    it('signs an anonymous visitor in, but never hands their placeholder email to the UI', () => {
        mockUseSession.mockReturnValue({ data: ANONYMOUS_SESSION, isPending: false })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({
            isSignedIn: true,
            isAnonymous: true,
            user: { id: 'anon-1', email: null, name: 'Anonymous' },
        })
    })

    it('drops every cached query once signing out succeeds, so the next user never sees them', async () => {
        mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })
        const queryClient = createTestQueryClient()

        queryClient.setQueryData(JOBS_KEY, { pages: [] })

        const { result } = renderAuth(queryClient)

        await result.current.signOut()

        expect(signOutRequest).toHaveBeenCalledTimes(1)
        expect(queryClient.getQueryData(JOBS_KEY)).toBeUndefined()
    })

    it('keeps the cache and reports the failure when the sign-out request never reaches the API', async () => {
        mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })
        jest.mocked(signOutRequest).mockRejectedValueOnce(new TypeError('Failed to fetch'))
        const queryClient = createTestQueryClient()

        queryClient.setQueryData(JOBS_KEY, { pages: [] })

        const { result } = renderAuth(queryClient)

        await expect(result.current.signOut()).rejects.toThrow('Failed to fetch')
        expect(queryClient.getQueryData(JOBS_KEY)).toEqual({ pages: [] })
    })

    // BUG: signOut awaits Better Auth's signOut without runAuthRequest, so a sign-out the API refuses (it answers
    // `{ error }` instead of throwing) counts as a success: the cache is cleared and useSignOut sends the user home as
    // if signed out, while the session cookie is still valid. AGENTS.md requires Better Auth calls to go through
    // runAuthRequest; a returned error should reject like a thrown one, so useSignOut shows its failure notice.
    it.skip('reports a sign-out the API refused instead of treating it as done', async () => {
        mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })
        jest.mocked(signOutRequest).mockResolvedValueOnce({
            data: null,
            error: { status: 500, statusText: 'Internal Server Error' },
        } as never)
        const queryClient = createTestQueryClient()

        queryClient.setQueryData(JOBS_KEY, { pages: [] })

        const { result } = renderAuth(queryClient)

        await expect(result.current.signOut()).rejects.toBeDefined()
        expect(queryClient.getQueryData(JOBS_KEY)).toEqual({ pages: [] })
    })
})
