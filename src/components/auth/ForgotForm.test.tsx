import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { ForgotForm } from './ForgotForm'

jest.mock('@/auth/authClient', () => ({ requestPasswordReset: jest.fn(async () => ({ error: null })) }))

describe('ForgotForm', () => {
    it('links the email field to its label', () => {
        renderWithProviders(<ForgotForm />)

        expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
})
