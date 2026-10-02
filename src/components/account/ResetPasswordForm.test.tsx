import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { ResetPasswordForm } from './ResetPasswordForm'

jest.mock('@/auth/authClient', () => ({ resetPassword: jest.fn(async () => ({ error: null })) }))

describe('ResetPasswordForm', () => {
    it('links every field to its label', () => {
        renderWithProviders(<ResetPasswordForm token="a-token" />)

        expect(screen.getByLabelText('New password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
    })
})
