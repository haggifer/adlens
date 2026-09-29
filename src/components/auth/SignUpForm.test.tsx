import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { SignUpForm } from './SignUpForm'

jest.mock('@/auth/authClient', () => ({
    signIn: { social: jest.fn(async () => ({ error: null })) },
    signUp: { email: jest.fn(async () => ({ error: null })) },
}))

describe('SignUpForm', () => {
    it('links every field to its label', () => {
        renderWithProviders(<SignUpForm />)

        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    })
})
