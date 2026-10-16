import { requestPasswordReset } from '@/auth/authClient'
import { describeError } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { screen, within } from '@testing-library/react'
import { ForgotForm } from './ForgotForm'

jest.mock('@/auth/authClient', () => ({ requestPasswordReset: jest.fn(async () => ({ error: null })) }))

const EMAIL = 'ann@example.com'

const renderForm = () => renderWithProviders(<ForgotForm />)

const submitEmail = async (user: ReturnType<typeof renderForm>['user']) => {
    await user.click(screen.getByLabelText('Email'))
    await user.paste(EMAIL)
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
}

describe('ForgotForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'forgot' })
    })

    it('sends a reset link to the address, then tells the user to check their inbox', async () => {
        const { user } = renderForm()

        await submitEmail(user)

        expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
        expect(requestPasswordReset).toHaveBeenCalledWith({ email: EMAIL })

        await user.click(screen.getByRole('button', { name: 'Back to sign in' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('keeps the form and shows the copy for a refused request, not the server’s message', async () => {
        const refused = { status: 429, message: 'Raw server text' }

        jest.mocked(requestPasswordReset).mockResolvedValueOnce({ data: null, error: refused } as never)
        const { user } = renderForm()

        await submitEmail(user)

        const alert = await screen.findByRole('alert')

        expect(within(alert).getByText(describeError(refused))).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
        expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument()
    })
})
