import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { deleteUser } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { DeleteAccountForm } from './DeleteAccountForm'

const signOut = jest.fn(async () => undefined)

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ signOut }) }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    deleteUser: jest.fn(async () => ({ error: null })),
}))

const renderForm = (hasPassword: boolean) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <App>
                <DeleteAccountForm hasPassword={hasPassword} />
            </App>
        </QueryClientProvider>,
    )

const confirmDeletion = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
}

describe('DeleteAccountForm without a password', () => {
    beforeEach(() => {
        jest.mocked(deleteUser).mockClear()
        signOut.mockClear()
        useAuthModalStore.setState({ view: null })
    })

    it('asks for no password and deletes once confirmed', async () => {
        renderForm(false)

        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

        await confirmDeletion()

        await waitFor(() => expect(deleteUser).toHaveBeenCalledWith({}))
    })

    it('asks to sign in again when the session is too old to delete without a password', async () => {
        jest.mocked(deleteUser).mockResolvedValueOnce({ error: { code: 'SESSION_EXPIRED' } } as never)
        renderForm(false)

        await confirmDeletion()

        await waitFor(() => expect(signOut).toHaveBeenCalled())
        expect(useAuthModalStore.getState().view).toBe('signin')
        expect(await screen.findByText('For your security, sign in again to delete your account.')).toBeInTheDocument()
    })
})
