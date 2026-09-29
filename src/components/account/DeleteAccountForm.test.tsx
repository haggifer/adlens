import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import type { AuthContextValue } from '@/auth/AuthContext'
import { authClient, deleteUser } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import { DeleteAccountForm } from './DeleteAccountForm'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    deleteUser: jest.fn(async () => ({ data: { success: true }, error: null })),
}))

const PASSWORD = 'correct horse battery staple'

const JOBS_KEY = ['jobs', MEMBER_USER.id]

const renderForm = (hasPassword: boolean, auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<DeleteAccountForm hasPassword={hasPassword} />)
}

const submitAndConfirm = async (user: UserEvent) => {
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.click(await screen.findByRole('button', { name: 'Delete my account' }))
}

describe('DeleteAccountForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: null })
    })

    afterEach(() => jest.restoreAllMocks())

    describe('with a password', () => {
        it('asks for the password before offering to delete', async () => {
            const { user } = renderForm(true)

            await user.click(screen.getByRole('button', { name: 'Delete account' }))

            expect(await screen.findByText('Enter your password')).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeInTheDocument()
            expect(deleteUser).not.toHaveBeenCalled()
        })

        it('deletes with the password once confirmed, drops the cached data and goes home', async () => {
            const queryClient = createTestQueryClient()

            queryClient.setQueryData(JOBS_KEY, { pages: [] })
            mockUseAuth.mockReturnValue(memberAuth())
            const { user } = renderWithProviders(<DeleteAccountForm hasPassword />, queryClient)

            await user.type(screen.getByLabelText('Password'), PASSWORD)
            await submitAndConfirm(user)

            expect(await screen.findByText('Your account has been deleted')).toBeInTheDocument()
            expect(deleteUser).toHaveBeenCalledWith({ password: PASSWORD })
            expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
            expect(queryClient.getQueryData(JOBS_KEY)).toBeUndefined()
            expect(mockPush).toHaveBeenCalledWith('/')
        })

        it('keeps the account when the user cancels', async () => {
            const { user } = renderForm(true)

            await user.type(screen.getByLabelText('Password'), PASSWORD)
            await user.click(screen.getByRole('button', { name: 'Delete account' }))
            await user.click(await screen.findByRole('button', { name: 'Cancel' }))

            expect(deleteUser).not.toHaveBeenCalled()
        })

        it('shows the copy for a wrong password and keeps the user signed in', async () => {
            const auth = memberAuth()

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'INVALID_PASSWORD', message: 'Raw server text' },
            } as never)
            const { user } = renderForm(true, auth)

            await user.type(screen.getByLabelText('Password'), 'wrong')
            await submitAndConfirm(user)

            expect(await screen.findByText('Wrong password.')).toBeInTheDocument()
            expect(auth.signOut).not.toHaveBeenCalled()
            expect(mockPush).not.toHaveBeenCalled()
        })

        // Only a password-less deletion depends on a fresh session, so an expired one here is an ordinary error.
        it('shows an expired session as an error instead of asking to sign in again', async () => {
            const auth = memberAuth()

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'SESSION_EXPIRED' },
            } as never)
            const { user } = renderForm(true, auth)

            await user.type(screen.getByLabelText('Password'), PASSWORD)
            await submitAndConfirm(user)

            expect(await screen.findByText('Your session has expired. Sign in again.')).toBeInTheDocument()
            expect(auth.signOut).not.toHaveBeenCalled()
            expect(useAuthModalStore.getState().view).toBeNull()
        })
    })

    describe('without a password', () => {
        it('asks for no password and deletes once confirmed', async () => {
            const { user } = renderForm(false)

            expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

            await submitAndConfirm(user)

            expect(await screen.findByText('Your account has been deleted')).toBeInTheDocument()
            expect(deleteUser).toHaveBeenCalledWith({})
        })

        it('asks to sign in again when the session is too old to delete without a password', async () => {
            const auth = memberAuth()

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'SESSION_EXPIRED' },
            } as never)
            const { user } = renderForm(false, auth)

            await submitAndConfirm(user)

            expect(
                await screen.findByText('For your security, sign in again to delete your account.'),
            ).toBeInTheDocument()
            await waitFor(() => expect(useAuthModalStore.getState().view).toBe('signin'))
            expect(auth.signOut).toHaveBeenCalledTimes(1)
            expect(mockPush).not.toHaveBeenCalled()
        })

        it('shows the error and closes the modal instead of hanging when sign-out fails before re-authentication', async () => {
            const auth = memberAuth()
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'SESSION_EXPIRED' },
            } as never)
            jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500 })
            const { user } = renderForm(false, auth)

            await submitAndConfirm(user)

            expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
            expect(
                screen.queryByText('For your security, sign in again to delete your account.'),
            ).not.toBeInTheDocument()
            await waitFor(() =>
                expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeInTheDocument(),
            )
            expect(useAuthModalStore.getState().view).toBeNull()
            expect(mockPush).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalledTimes(1)
        })
    })
})
