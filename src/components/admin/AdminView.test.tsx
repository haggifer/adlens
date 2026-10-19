import { listAdminJobs, listAdminUsers } from '@/api/admin'
import { ApiRequestError, describeRequestError } from '@/api/errors'
import type { AuthContextValue } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { adminAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor, within } from '@testing-library/react'
import { type AdminJob, type AdminUser, JobStatus, RequestErrorCode } from 'adlens-shared'
import { AdminView } from './AdminView'
import { UNKNOWN_OWNER_TIP } from './JobsTable'
import { USER_TYPE_TAGS } from './UsersTable'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/admin', () => ({ listAdminJobs: jest.fn(), listAdminUsers: jest.fn() }))
jest.mock('@/components/status/NotFoundState', () => ({ NotFoundState: () => <div data-testid="not-found" /> }))

const USER: AdminUser = {
    id: 'u1',
    createdAt: '2026-09-01T10:00:00.000Z',
    email: 'ana@example.com',
    isAnonymous: false,
    emailVerified: true,
    isAdmin: false,
}

const JOB: AdminJob = {
    id: 'j1',
    createdAt: '2026-09-30T10:00:00.000Z',
    status: JobStatus.Analyzed,
    userId: USER.id,
    file: { name: 'summer-ad.mp4' },
}

const renderView = () => {
    mockUseAuth.mockReturnValue(adminAuth())

    return renderWithProviders(<AdminView />)
}

const getRow = (text: string): HTMLElement => {
    const row = screen.getByText(text).closest('tr')

    if (!row) {
        throw new Error(`No table row holds ${text}`)
    }

    return row
}

// Some tests switch antd tabs or reload: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('AdminView', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(listAdminJobs).mockResolvedValue([JOB])
        jest.mocked(listAdminUsers).mockResolvedValue([USER])
    })

    it('lists the jobs, and the users on their own tab', async () => {
        const { user } = renderView()

        expect(await screen.findByText(JOB.file.name)).toBeInTheDocument()
        expect(within(getRow(JOB.file.name)).getByText(USER.email ?? '')).toBeInTheDocument()

        await user.click(screen.getByRole('tab', { name: 'Users', hidden: true }))

        expect(await screen.findByText(USER_TYPE_TAGS[AccountKind.Member].label)).toBeInTheDocument()
    })

    it('still lists the jobs when the users can’t be read, with each owner unknown and the error shown', async () => {
        jest.mocked(listAdminUsers).mockRejectedValue(new ApiRequestError(RequestErrorCode.Unavailable))
        renderView()

        expect(await screen.findByText(describeRequestError(RequestErrorCode.Unavailable))).toBeInTheDocument()
        await screen.findByText(JOB.file.name)
        expect(within(getRow(JOB.file.name)).getByLabelText(UNKNOWN_OWNER_TIP)).toBeInTheDocument()
    })

    it('shows not found instead of the tables once the account is no longer an admin', async () => {
        jest.mocked(listAdminJobs).mockRejectedValue(new ApiRequestError(RequestErrorCode.NotFound))
        renderView()

        expect(await screen.findByTestId('not-found')).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('reads the jobs and the users again on Reload', async () => {
        const { user } = renderView()

        await screen.findByText(JOB.file.name)
        await user.click(screen.getByRole('button', { name: /Reload/, hidden: true }))

        await waitFor(() => expect(listAdminJobs).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(listAdminUsers).toHaveBeenCalledTimes(2))
    })
})
