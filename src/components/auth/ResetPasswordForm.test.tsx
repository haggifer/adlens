import { resetPassword } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from './ResetPasswordForm'

jest.mock('@/auth/authClient', () => ({ resetPassword: jest.fn(async () => ({ error: null })) }))

const NEW_PASSWORD = 'a-new-password-123'

describe('ResetPasswordForm', () => {
    beforeEach(() => {
        jest.mocked(resetPassword).mockClear()
        useAuthModalStore.setState({ view: 'reset', resetToken: 'a-token' })
    })

    it('links every field to its label', () => {
        renderWithProviders(<ResetPasswordForm />)

        expect(screen.getByLabelText('New password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
    })

    it('resets with the link’s token, then offers to sign in within the modal', async () => {
        const user = userEvent.setup()

        renderWithProviders(<ResetPasswordForm />)

        await user.type(screen.getByLabelText('New password'), NEW_PASSWORD)
        await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD)
        await user.click(screen.getByRole('button', { name: 'Set new password' }))
        await user.click(await screen.findByRole('button', { name: 'Sign in' }))

        expect(resetPassword).toHaveBeenCalledWith({ newPassword: NEW_PASSWORD, token: 'a-token' })
        expect(useAuthModalStore.getState().view).toBe('signin')
    })
})
