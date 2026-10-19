import { listAdminUsers } from '@/api/admin'
import type { AuthContextValue } from '@/auth/AuthContext'
import { adminAuth, anonymousAuth, MEMBER_USER, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { AdminUser } from 'adlens-shared'
import type { ReactNode } from 'react'
import { ADMIN_QUERY_KEY } from './useAdminJobs'
import { useAdminUsers } from './useAdminUsers'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/admin', () => ({ listAdminUsers: jest.fn() }))

const USER: AdminUser = {
    id: 'u1',
    createdAt: '2026-09-01T10:00:00.000Z',
    email: 'ana@example.com',
    isAnonymous: false,
    emailVerified: true,
    isAdmin: false,
}

const renderUseAdminUsers = (auth: AuthContextValue) => {
    const queryClient = createTestQueryClient()

    mockUseAuth.mockReturnValue(auth)

    const { result } = renderHook(() => useAdminUsers(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
    })

    return { result, queryClient }
}

describe('useAdminUsers', () => {
    beforeEach(() => jest.mocked(listAdminUsers).mockReset())

    it.each([
        ['without a session', signedOutAuth],
        ['for an anonymous session', anonymousAuth],
        ['for an unconfirmed account', unconfirmedAuth],
        ['for a member', memberAuth],
    ])('reads nothing %s', (_, createAuth) => {
        const { result } = renderUseAdminUsers(createAuth())

        expect(result.current.users).toEqual([])
        expect(listAdminUsers).not.toHaveBeenCalled()
    })

    it('reads the users for an admin, cached under the admin’s id', async () => {
        jest.mocked(listAdminUsers).mockResolvedValue([USER])

        const { result, queryClient } = renderUseAdminUsers(adminAuth())

        await waitFor(() => expect(result.current.users).toEqual([USER]))
        expect(listAdminUsers).toHaveBeenCalledTimes(1)
        expect(queryClient.getQueryCache().findAll({ queryKey: [ADMIN_QUERY_KEY, MEMBER_USER.id] })).toHaveLength(1)
    })
})
