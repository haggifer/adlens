import { listAdminJobs } from '@/api/admin'
import type { AuthContextValue } from '@/auth/AuthContext'
import { adminAuth, anonymousAuth, MEMBER_USER, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { createTestQueryClient } from '@/test/render'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type AdminJob, JobStatus } from 'adlens-shared'
import type { ReactNode } from 'react'
import { ADMIN_QUERY_KEY, useAdminJobs } from './useAdminJobs'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/admin', () => ({ listAdminJobs: jest.fn() }))

const JOB: AdminJob = {
    id: 'j1',
    createdAt: '2026-09-30T10:00:00.000Z',
    status: JobStatus.Analyzed,
    userId: 'u1',
    file: { name: 'summer-ad.mp4' },
}

const renderUseAdminJobs = (auth: AuthContextValue) => {
    const queryClient = createTestQueryClient()

    mockUseAuth.mockReturnValue(auth)

    const { result } = renderHook(() => useAdminJobs(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
    })

    return { result, queryClient }
}

describe('useAdminJobs', () => {
    beforeEach(() => jest.mocked(listAdminJobs).mockReset())

    it.each([
        ['without a session', signedOutAuth],
        ['for an anonymous session', anonymousAuth],
        ['for an unconfirmed account', unconfirmedAuth],
        ['for a member', memberAuth],
    ])('reads nothing %s', (_, createAuth) => {
        const { result } = renderUseAdminJobs(createAuth())

        expect(result.current.jobs).toEqual([])
        expect(listAdminJobs).not.toHaveBeenCalled()
    })

    it('reads the jobs for an admin, cached under the admin’s id', async () => {
        jest.mocked(listAdminJobs).mockResolvedValue([JOB])

        const { result, queryClient } = renderUseAdminJobs(adminAuth())

        await waitFor(() => expect(result.current.jobs).toEqual([JOB]))
        expect(listAdminJobs).toHaveBeenCalledTimes(1)
        expect(queryClient.getQueryCache().findAll({ queryKey: [ADMIN_QUERY_KEY, MEMBER_USER.id] })).toHaveLength(1)
    })
})
