import { screen, waitFor, within } from '@testing-library/react'
import { signUp } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { SignUpForm } from './SignUpForm'

jest.mock('@/auth/authClient', () => ({
    signIn: { social: jest.fn(async () => ({ error: null })) },
    signUp: { email: jest.fn(async () => ({ error: null })) },
}))

const SIGN_UP_FIELDS = [
    ['Name', 'Ann'],
    ['Email', 'ann@example.com'],
    ['Password', 'long-enough-password'],
    ['Confirm password', 'long-enough-password'],
]

const ALREADY_IN_USE_COPY = 'This email is already in use. Sign in instead.'

const renderForm = () => renderWithProviders(<SignUpForm />)

// Pasted rather than typed: typing each character re-renders the form, which timed out under a full parallel run.
const submitSignUp = async (user: ReturnType<typeof renderForm>['user']) => {
    for (const [label, value] of SIGN_UP_FIELDS) {
        await user.click(screen.getByLabelText(label))
        await user.paste(value)
    }

    await user.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('SignUpForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'signup', isOtherAddressLink: false })
    })

    it('links every field to its label', () => {
        renderForm()

        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    })

    it('signs the new account up and opens the confirmation dialog', async () => {
        const { user } = renderForm()

        await submitSignUp(user)

        expect(signUp.email).toHaveBeenCalledWith({
            name: 'Ann',
            email: 'ann@example.com',
            password: 'long-enough-password',
        })
        await waitFor(() => expect(useAuthModalStore.getState().view).toBe('confirm'))
    })

    it('says an address already in use is taken, and offers sign-in instead', async () => {
        jest.mocked(signUp.email).mockResolvedValueOnce({
            data: null,
            error: { status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'Raw server text' },
        } as never)
        const { user } = renderForm()

        await submitSignUp(user)

        const alert = await screen.findByRole('alert')

        expect(within(alert).getByText(ALREADY_IN_USE_COPY)).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
        expect(useAuthModalStore.getState().view).toBe('signup')

        await user.click(within(alert).getByRole('button', { name: 'Sign in' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })
})
