import { ApiRequestError, describeRequestError } from '@/api/errors'
import { changePassword, listAccounts, revokeOtherSessions } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { describeError } from '@/auth/errors'
import { initializingAuth, MEMBER_USER, memberAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { RequestErrorCode } from 'adlens-shared'
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

const CURRENT_PASSWORD = 'correct horse battery staple'

const NEW_PASSWORD = 'a-new-password-123'

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

        expect(await screen.findByRole('alert')).toHaveTextContent(describeError({ status: 500 }))
        expect(screen.queryByText('Internal adapter failure')).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Other devices' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Delete account' })).not.toBeInTheDocument()
        expect(document.querySelector('.ant-skeleton')).not.toBeInTheDocument()
    })

    it('treats a lost session as any API call does, so the app asks to sign in again', async () => {
        jest.mocked(listAccounts).mockResolvedValue({ data: null, error: { status: 401 } } as never)
        const { queryClient } = renderSettings()

        expect(await screen.findByRole('alert')).toHaveTextContent(
            describeRequestError(RequestErrorCode.Unauthenticated),
        )

        const { error } = queryClient.getQueryState(['linkedAccounts', MEMBER_USER.id]) ?? {}

        expect(error).toBeInstanceOf(ApiRequestError)
        expect(error).toMatchObject({ code: RequestErrorCode.Unauthenticated })
    })

    it('says AdLens is unreachable when the sign-in methods request never reaches it', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(listAccounts).mockRejectedValue(new TypeError('Failed to fetch'))
        renderSettings()

        expect(await screen.findByRole('alert')).toHaveTextContent(describeError({ code: 'NETWORK_ERROR' }))
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

        expect(await screen.findByText(describeError({ status: 429 }))).toBeInTheDocument()
        expect(screen.queryByText('Rate limit exceeded')).not.toBeInTheDocument()
    })

    it('changes the password, signing out the other devices, and clears the form', async () => {
        linkAccounts('credential')
        const { user } = renderSettings()

        // Pasted rather than typed: typing each character re-renders the form, slow under a full parallel run.
        await user.click(await screen.findByLabelText('Current password'))
        await user.paste(CURRENT_PASSWORD)
        await user.click(screen.getByLabelText('New password'))
        await user.paste(NEW_PASSWORD)
        await user.click(screen.getByLabelText('Confirm new password'))
        await user.paste(NEW_PASSWORD)
        await user.click(screen.getByRole('button', { name: 'Change password' }))

        expect(await screen.findByText('Password changed')).toBeInTheDocument()
        expect(changePassword).toHaveBeenCalledWith({
            currentPassword: CURRENT_PASSWORD,
            newPassword: NEW_PASSWORD,
            revokeOtherSessions: true,
        })
        expect(screen.getByLabelText('Current password')).toHaveValue('')
        expect(screen.getByLabelText('New password')).toHaveValue('')
        expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
    })
})
