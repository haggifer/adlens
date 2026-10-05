import { ACCOUNT_KIND_COOKIE } from '@/auth/account-kind-cookie'
import { signOut as signOutRequest } from '@/auth/authClient'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { createTestQueryClient } from '@/test/render'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'

const mockUseSession = jest.fn()

jest.mock('@/auth/authClient', () => ({
    signOut: jest.fn(async () => ({ data: { success: true }, error: null })),
    useSession: () => mockUseSession(),
}))

const JOBS_KEY = ['jobs', 'member-1']

const MEMBER_SESSION = {
    user: { id: 'member-1', email: 'ann@example.com', name: 'Ann', isAnonymous: false, emailVerified: true },
}

const ADMIN_SESSION = { user: { ...MEMBER_SESSION.user, isAdmin: true } }

const UNCONFIRMED_SESSION = {
    user: { id: 'member-2', email: 'bob@example.com', name: 'Bob', isAnonymous: false, emailVerified: false },
}

// Better Auth gives an anonymous user a generated placeholder address.
const ANONYMOUS_SESSION = {
    user: {
        id: 'anon-1',
        email: 'temp-4f2a@anonymous.useadlens.com',
        name: 'Anonymous',
        isAnonymous: true,
        emailVerified: false,
    },
}

const renderAuth = (queryClient: QueryClient = createTestQueryClient(), initialKind: AccountKind | null = null) =>
    renderHook(() => useAuth(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                <AuthProvider initialKind={initialKind}>{children}</AuthProvider>
            </QueryClientProvider>
        ),
    })

const rememberKind = (kind: AccountKind) => {
    document.cookie = `${ACCOUNT_KIND_COOKIE}=${kind}; path=/`
}

describe('AuthProvider', () => {
    beforeEach(() => {
        jest.mocked(signOutRequest).mockClear()
    })

    afterEach(() => jest.restoreAllMocks())

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
            isEmailConfirmed: false,
            user: null,
        })
    })

    it('gives a member their email and a confirmed address', () => {
        mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({
            isSignedIn: true,
            isAnonymous: false,
            isEmailConfirmed: true,
            user: { id: 'member-1', email: 'ann@example.com', name: 'Ann' },
        })
    })

    it('signs in an account whose email isn’t confirmed yet, and gives it the address it typed', () => {
        mockUseSession.mockReturnValue({ data: UNCONFIRMED_SESSION, isPending: false })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({
            isSignedIn: true,
            isAnonymous: false,
            isEmailConfirmed: false,
            user: { id: 'member-2', email: 'bob@example.com', name: 'Bob' },
        })
    })

    it('signs an anonymous visitor in, but never hands their placeholder email to the UI', () => {
        mockUseSession.mockReturnValue({ data: ANONYMOUS_SESSION, isPending: false })

        const { result } = renderAuth()

        expect(result.current).toMatchObject({
            isSignedIn: true,
            isAnonymous: true,
            isEmailConfirmed: false,
            user: { id: 'anon-1', email: null, name: 'Anonymous' },
        })
    })

    describe('the account kind snapshot', () => {
        afterEach(() => {
            document.cookie = `${ACCOUNT_KIND_COOKIE}=; max-age=0; path=/`
        })

        it.each([
            [AccountKind.Member, MEMBER_SESSION],
            [AccountKind.Admin, ADMIN_SESSION],
            [AccountKind.Unconfirmed, UNCONFIRMED_SESSION],
            [AccountKind.Anonymous, ANONYMOUS_SESSION],
        ])('remembers only the kind, %s, once the session loads', (kind, session) => {
            mockUseSession.mockReturnValue({ data: session, isPending: false })

            const { result } = renderAuth()

            expect(result.current.accountKind).toBe(kind)
            expect(document.cookie).toBe(`${ACCOUNT_KIND_COOKIE}=${kind}`)
        })

        it('forgets the kind when the session loads as none', () => {
            rememberKind(AccountKind.Member)
            mockUseSession.mockReturnValue({ data: null, isPending: false })

            renderAuth()

            expect(document.cookie).toBe('')
        })

        it('keeps the kind when the session couldn’t be loaded', () => {
            rememberKind(AccountKind.Member)
            mockUseSession.mockReturnValue({ data: null, isPending: false, error: { status: 0 } })

            renderAuth()

            expect(document.cookie).toBe(`${ACCOUNT_KIND_COOKIE}=${AccountKind.Member}`)
        })

        it('gives the kind the server read while the session loads, and leaves the cookie alone', () => {
            rememberKind(AccountKind.Anonymous)
            mockUseSession.mockReturnValue({ data: null, isPending: true })

            const { result } = renderAuth(createTestQueryClient(), AccountKind.Anonymous)

            expect(result.current).toMatchObject({
                isInitializing: true,
                isSignedIn: false,
                accountKind: null,
                snapshotKind: AccountKind.Anonymous,
            })
            expect(document.cookie).toBe(`${ACCOUNT_KIND_COOKIE}=${AccountKind.Anonymous}`)
        })

        it('gives the real account once the session has loaded, not the snapshot', () => {
            mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })

            const { result } = renderAuth(createTestQueryClient(), AccountKind.Anonymous)

            expect(result.current).toMatchObject({ accountKind: AccountKind.Member, snapshotKind: null })
        })

        it('gives no snapshot once the session loads as none, even with one from the server', () => {
            mockUseSession.mockReturnValue({ data: null, isPending: false })

            const { result } = renderAuth(createTestQueryClient(), AccountKind.Member)

            expect(result.current).toMatchObject({ isSignedIn: false, accountKind: null, snapshotKind: null })
        })

        it('forgets the kind on sign-out', async () => {
            mockUseSession.mockReturnValue({ data: MEMBER_SESSION, isPending: false })

            const { result } = renderAuth()

            await result.current.signOut()

            expect(document.cookie).toBe('')
        })
    })

    describe('when the session changes after it has loaded', () => {
        const renderChangingSession = (initialSession: object | null, isPending = false) => {
            mockUseSession.mockReturnValue({ data: initialSession, isPending })
            const queryClient = createTestQueryClient()
            const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
            const { rerender } = renderAuth(queryClient)

            const changeSessionTo = (session: object | null) => {
                mockUseSession.mockReturnValue({ data: session, isPending: false })
                rerender()
            }

            return { invalidate, changeSessionTo }
        }

        it('refreshes nothing when the session first loads', () => {
            const { invalidate, changeSessionTo } = renderChangingSession(null, true)

            changeSessionTo(MEMBER_SESSION)

            expect(invalidate).not.toHaveBeenCalled()
        })

        it('refreshes the limits and the history when another user takes over the session', () => {
            const { invalidate, changeSessionTo } = renderChangingSession(ANONYMOUS_SESSION)

            changeSessionTo(MEMBER_SESSION)

            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['quota'] })
            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['jobs'] })
        })

        it('refreshes the limits once the email is confirmed, in this tab or another', () => {
            const { invalidate, changeSessionTo } = renderChangingSession(UNCONFIRMED_SESSION)

            changeSessionTo({ user: { ...UNCONFIRMED_SESSION.user, emailVerified: true } })

            expect(invalidate).toHaveBeenCalledWith({ queryKey: ['quota'] })
            expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['jobs'] })
        })

        it('refreshes nothing when the same session is fetched again', () => {
            const { invalidate, changeSessionTo } = renderChangingSession(MEMBER_SESSION)

            changeSessionTo({ user: { ...MEMBER_SESSION.user } })

            expect(invalidate).not.toHaveBeenCalled()
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
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const failure = new TypeError('Failed to fetch')

        jest.mocked(signOutRequest).mockRejectedValueOnce(failure)
        const queryClient = createTestQueryClient()

        queryClient.setQueryData(JOBS_KEY, { pages: [] })

        const { result } = renderAuth(queryClient)

        await expect(result.current.signOut()).rejects.toEqual({ code: 'NETWORK_ERROR' })
        expect(queryClient.getQueryData(JOBS_KEY)).toEqual({ pages: [] })
        expect(consoleError).toHaveBeenCalledWith(failure)
    })

    it('reports a sign-out the API refused instead of treating it as done', async () => {
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
