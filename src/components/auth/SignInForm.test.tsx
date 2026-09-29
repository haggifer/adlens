import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { SignInForm } from './SignInForm'

jest.mock('@/auth/authClient', () => ({
    signIn: { email: jest.fn(async () => ({ error: null })), social: jest.fn(async () => ({ error: null })) },
}))

describe('SignInForm', () => {
    it('links every field to its label', () => {
        renderWithProviders(<SignInForm />)

        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })
})
