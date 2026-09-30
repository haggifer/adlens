import { screen } from '@testing-library/react'
import type { AuthContextValue } from '@/auth/AuthContext'
import { anonymousAuth, signedOutAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { SignUpForm } from './SignUpForm'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    signIn: { social: jest.fn(async () => ({ error: null })) },
    signUp: { email: jest.fn(async () => ({ error: null })) },
}))

const KEEP_ANALYSES_COPY = /to keep the analyses you ran here/i

const renderForm = (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<SignUpForm />)
}

const SIGN_UP_FIELDS = [
    ['Name', 'Ann'],
    ['Email', 'ann@example.com'],
    ['Password', 'long-enough-password'],
    ['Confirm password', 'long-enough-password'],
]

// Pasted rather than typed: typing each character re-renders the form, which timed out under a full parallel run.
const submitSignUp = async (user: ReturnType<typeof renderForm>['user']) => {
    for (const [label, value] of SIGN_UP_FIELDS) {
        await user.click(screen.getByLabelText(label))
        await user.paste(value)
    }

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByText('Check your inbox')
}

describe('SignUpForm', () => {
    it('links every field to its label', () => {
        renderForm(signedOutAuth())

        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    })

    it('tells an anonymous visitor how to keep the analyses they ran in this browser', async () => {
        const { user } = renderForm(anonymousAuth())

        await submitSignUp(user)

        expect(screen.getByText(KEEP_ANALYSES_COPY)).toBeInTheDocument()
    })

    it('says nothing about earlier analyses to a visitor who never ran one', async () => {
        const { user } = renderForm(signedOutAuth())

        await submitSignUp(user)

        expect(screen.queryByText(KEEP_ANALYSES_COPY)).not.toBeInTheDocument()
    })
})
