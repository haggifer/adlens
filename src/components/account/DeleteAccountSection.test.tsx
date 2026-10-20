import { authClient, deleteUser } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { describeError } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { MEMBER_USER, memberAuth } from '@/test/auth'
import { createTestQueryClient, renderWithProviders } from '@/test/render'
import type { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { DELETION_SCOPE } from './DeleteAccountForm'
import { DeleteAccountSection } from './DeleteAccountSection'

const mockPush = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    deleteUser: jest.fn(async () => ({ data: { success: true }, error: null })),
}))

// Each test opens antd's modal and types a password: seconds of work under a full parallel run.
jest.setTimeout(20_000)

const PASSWORD = 'correct horse battery staple'

const JOBS_KEY = ['jobs', MEMBER_USER.id]

const renderSection = (hasPassword: boolean, auth: AuthContextValue = memberAuth(), queryClient?: QueryClient) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<DeleteAccountSection hasPassword={hasPassword} />, queryClient)
}

const openModal = async (user: UserEvent) => {
    await user.click(screen.getByRole('button', { name: 'Delete account' }))

    return screen.findByRole('dialog')
}

// The page's button and the modal's submit share the label, so the submit is looked up inside the modal.
const getDeleteButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete account' })

const expectModalClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

describe('DeleteAccountSection', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: null })
    })

    afterEach(() => jest.restoreAllMocks())

    it('shows only its title, what deleting removes and the button that opens the deletion', () => {
        renderSection(true)

        expect(screen.getByRole('heading', { name: 'Delete account' })).toBeInTheDocument()
        expect(screen.getByText(DELETION_SCOPE)).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    })

    describe('with a password', () => {
        it('asks for the password before deleting', async () => {
            const { user } = renderSection(true)

            await openModal(user)
            await user.click(getDeleteButton())

            expect(await screen.findByText('Enter your password')).toBeInTheDocument()
            expect(deleteUser).not.toHaveBeenCalled()
        })

        it('deletes with the password, drops the cached data and goes home', async () => {
            const queryClient = createTestQueryClient()

            queryClient.setQueryData(JOBS_KEY, { pages: [] })
            const { user } = renderSection(true, memberAuth(), queryClient)

            await openModal(user)
            await user.type(screen.getByLabelText('Password'), PASSWORD)
            await user.click(getDeleteButton())

            expect(await screen.findByText('Your account has been deleted')).toBeInTheDocument()
            expect(deleteUser).toHaveBeenCalledWith({ password: PASSWORD })
            expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
            expect(queryClient.getQueryData(JOBS_KEY)).toBeUndefined()
            expect(mockPush).toHaveBeenCalledWith('/')
        })

        it('keeps the account when the user cancels, and forgets the typed password', async () => {
            const { user } = renderSection(true)

            await openModal(user)
            await user.type(screen.getByLabelText('Password'), PASSWORD)
            await user.click(screen.getByRole('button', { name: 'Cancel' }))
            await expectModalClosed()
            await openModal(user)

            expect(deleteUser).not.toHaveBeenCalled()
            expect(screen.getByLabelText('Password')).toHaveValue('')
        })

        it('shows the copy for a wrong password, keeps the modal open and the user signed in', async () => {
            const auth = memberAuth()

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'INVALID_PASSWORD', message: 'Raw server text' },
            } as never)
            const { user } = renderSection(true, auth)

            await openModal(user)
            await user.type(screen.getByLabelText('Password'), 'wrong')
            await user.click(getDeleteButton())

            expect(await screen.findByText(describeError({ code: 'INVALID_PASSWORD' }))).toBeInTheDocument()
            expect(getDeleteButton()).toBeInTheDocument()
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
            const { user } = renderSection(true, auth)

            await openModal(user)
            await user.type(screen.getByLabelText('Password'), PASSWORD)
            await user.click(getDeleteButton())

            expect(await screen.findByText(describeError({ code: 'SESSION_EXPIRED' }))).toBeInTheDocument()
            expect(auth.signOut).not.toHaveBeenCalled()
            expect(useAuthModalStore.getState().view).toBeNull()
        })
    })

    describe('without a password', () => {
        it('asks for no password and deletes from the modal', async () => {
            const { user } = renderSection(false)

            await openModal(user)

            expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

            await user.click(getDeleteButton())

            expect(await screen.findByText('Your account has been deleted')).toBeInTheDocument()
            expect(deleteUser).toHaveBeenCalledWith({})
        })

        it('closes the modal and asks to sign in again when the session is too old', async () => {
            const auth = memberAuth()

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'SESSION_EXPIRED' },
            } as never)
            const { user } = renderSection(false, auth)

            await openModal(user)
            await user.click(getDeleteButton())

            expect(
                await screen.findByText('For your security, sign in again to delete your account.'),
            ).toBeInTheDocument()
            await waitFor(() => expect(useAuthModalStore.getState().view).toBe('signin'))
            await expectModalClosed()
            expect(auth.signOut).toHaveBeenCalledTimes(1)
            expect(mockPush).not.toHaveBeenCalled()
        })

        it('shows the error and closes the modal when sign-out fails before re-authentication', async () => {
            const auth = memberAuth()
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

            jest.mocked(deleteUser).mockResolvedValueOnce({
                data: null,
                error: { status: 400, code: 'SESSION_EXPIRED' },
            } as never)
            jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500 })
            const { user } = renderSection(false, auth)

            await openModal(user)
            await user.click(getDeleteButton())

            expect(await screen.findByText(describeError({ status: 500 }))).toBeInTheDocument()
            expect(
                screen.queryByText('For your security, sign in again to delete your account.'),
            ).not.toBeInTheDocument()
            await expectModalClosed()
            expect(useAuthModalStore.getState().view).toBeNull()
            expect(mockPush).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalledTimes(1)
        })
    })
})
