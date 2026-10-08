import { listAccounts, revokeOtherSessions } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { initializingAuth, MEMBER_USER, memberAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { AccountSettings } from './AccountSettings'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    changePassword: jest.fn(async () => ({ error: null })),
    deleteUser: jest.fn(async () => ({ error: null })),
    listAccounts: jest.fn(),
    requestPasswordReset: jest.fn(async () => ({ error: null })),
    revokeOtherSessions: jest.fn(async () => ({ error: null })),
}))

const linkAccounts = (...providerIds: string[]) =>
    jest.mocked(listAccounts).mockResolvedValue({
        data: providerIds.map((providerId) => ({ providerId })),
        error: null,
    } as never)

const SECTION_HEADINGS = ['Sign-in methods', 'Change password', 'Other devices', 'Delete account']

const renderSettings = (auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<AccountSettings />)
}

describe('AccountSettings', () => {
    beforeEach(() => jest.clearAllMocks())

    it('offers a user with a password to change it, and asks for it to delete the account', async () => {
        linkAccounts('credential', 'google')
        const { queryClient } = renderSettings()

        expect(await screen.findByText('Email and password, Google')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(queryClient.getQueryData(['linkedAccounts', MEMBER_USER.id])).toEqual(['credential', 'google'])
    })

    it('offers a user who signs in with a provider only to set a password, and deletes without one', async () => {
        linkAccounts('github')
        renderSettings()

        expect(await screen.findByText('GitHub')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Change password' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /email me a link/i })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Delete account' })).toBeInTheDocument()
        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    })

    it('shows placeholders, and no section, until the sign-in methods have loaded', () => {
        jest.mocked(listAccounts).mockReturnValue(new Promise(() => {}) as never)
        const { container } = renderSettings()

        expect(container.querySelectorAll('.ant-skeleton')).not.toHaveLength(0)
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
        expect(screen.queryByText(MEMBER_USER.email ?? '', { exact: false })).not.toBeInTheDocument()
    })

    it('shows placeholders while the session loads, without asking for the sign-in methods', () => {
        const { container } = renderSettings(initializingAuth())

        expect(container.querySelectorAll('.ant-skeleton')).not.toHaveLength(0)
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
        expect(listAccounts).not.toHaveBeenCalled()
    })

    it('shows every section at once when the sign-in methods load', async () => {
        linkAccounts('credential')
        const { container } = renderSettings()

        expect(await screen.findByRole('heading', { name: 'Sign-in methods' })).toBeInTheDocument()

        for (const heading of SECTION_HEADINGS) {
            expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
        }

        expect(container.querySelector('.ant-skeleton')).not.toBeInTheDocument()
        expect(screen.getByText(`${MEMBER_USER.name} · ${MEMBER_USER.email}`)).toBeInTheDocument()
    })

    it('says the sign-in methods couldn’t load when the server refuses, not the server’s message', async () => {
        jest.mocked(listAccounts).mockResolvedValue({
            data: null,
            error: { status: 500, message: 'Internal adapter failure' },
        } as never)
        renderSettings()

        expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
        expect(screen.queryByText('Internal adapter failure')).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Other devices' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Delete account' })).not.toBeInTheDocument()
        expect(document.querySelector('.ant-skeleton')).not.toBeInTheDocument()
    })

    it('says AdLens is unreachable when the sign-in methods request never reaches it', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(listAccounts).mockRejectedValue(new TypeError('Failed to fetch'))
        renderSettings()

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Couldn’t reach AdLens. Check your connection and try again.',
        )
        expect(screen.getByRole('heading', { name: 'Other devices' })).toBeInTheDocument()
        expect(consoleError).toHaveBeenCalledTimes(1)
        consoleError.mockRestore()
    })

    it('signs out every other device', async () => {
        linkAccounts('credential')
        const { user } = renderSettings()

        await user.click(await screen.findByRole('button', { name: 'Sign out other devices' }))

        expect(revokeOtherSessions).toHaveBeenCalledTimes(1)
        expect(await screen.findByText('Signed out of all other devices')).toBeInTheDocument()
    })

    it('explains why the other devices couldn’t be signed out', async () => {
        linkAccounts('credential')
        jest.mocked(revokeOtherSessions).mockResolvedValueOnce({
            data: null,
            error: { status: 429, message: 'Rate limit exceeded' },
        } as never)
        const { user } = renderSettings()

        await user.click(await screen.findByRole('button', { name: 'Sign out other devices' }))

        expect(await screen.findByText('Too many attempts. Wait a minute and try again.')).toBeInTheDocument()
        expect(screen.queryByText('Rate limit exceeded')).not.toBeInTheDocument()
    })

    it('labels the change-password fields', async () => {
        linkAccounts('credential')
        renderSettings()

        expect(await screen.findByLabelText('Current password')).toBeInTheDocument()
        expect(screen.getByLabelText('New password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
    })
})
