import { resetPassword } from '@/auth/authClient'
import { describeResetError } from '@/auth/errors'
import { announceSessionChange, refreshSession } from '@/auth/session'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { ResetPasswordForm } from './ResetPasswordForm'

jest.mock('@/auth/authClient', () => ({ resetPassword: jest.fn(async () => ({ error: null })) }))
jest.mock('@/auth/session', () => ({ announceSessionChange: jest.fn(), refreshSession: jest.fn() }))

const NEW_PASSWORD = 'a-new-password-123'

// Pasted rather than typed: typing each character re-renders the form, which timed out under a full parallel run.
const submitNewPassword = async (user: UserEvent) => {
    await user.click(screen.getByLabelText('New password'))
    await user.paste(NEW_PASSWORD)
    await user.click(screen.getByLabelText('Confirm new password'))
    await user.paste(NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Set new password' }))
}

describe('ResetPasswordForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'reset', resetToken: 'a-token' })
    })

    it('resets with the link’s token, signs the tabs out, then offers to sign in within the modal', async () => {
        const user = userEvent.setup()

        renderWithProviders(<ResetPasswordForm />)

        await submitNewPassword(user)
        await user.click(await screen.findByRole('button', { name: 'Sign in' }))

        expect(resetPassword).toHaveBeenCalledWith({ newPassword: NEW_PASSWORD, token: 'a-token' })
        expect(refreshSession).toHaveBeenCalled()
        expect(announceSessionChange).toHaveBeenCalled()
        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('says an expired link has expired, though Better Auth calls it invalid', async () => {
        const expired = { status: 400, code: 'INVALID_TOKEN', message: 'Invalid token' }
        const user = userEvent.setup()

        jest.mocked(resetPassword).mockResolvedValueOnce({ data: null, error: expired } as never)
        renderWithProviders(<ResetPasswordForm />)

        await submitNewPassword(user)

        expect(await screen.findByText(describeResetError(expired))).toBeInTheDocument()
        expect(refreshSession).not.toHaveBeenCalled()
    })
})
