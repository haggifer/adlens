import { requestPasswordReset } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { MEMBER_EMAIL, memberAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { SetPasswordSection } from './SetPasswordSection'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({ requestPasswordReset: jest.fn(async () => ({ error: null })) }))

const renderSection = () => {
    mockUseAuth.mockReturnValue(memberAuth())

    return renderWithProviders(<SetPasswordSection />)
}

describe('SetPasswordSection', () => {
    beforeEach(() => jest.mocked(requestPasswordReset).mockClear())

    it('emails the user a link to set a password', async () => {
        const { user } = renderSection()

        await user.click(screen.getByRole('button', { name: /email me a link/i }))

        expect(await screen.findByText(`Check your inbox at ${MEMBER_EMAIL}`)).toBeInTheDocument()
        expect(requestPasswordReset).toHaveBeenCalledWith({ email: MEMBER_EMAIL })
    })

    it('explains why the link couldn’t be sent', async () => {
        jest.mocked(requestPasswordReset).mockResolvedValueOnce({
            error: { status: 500, code: 'EMAIL_NOT_SENT', message: 'SMTP timeout' },
        } as never)
        const { user } = renderSection()

        await user.click(screen.getByRole('button', { name: /email me a link/i }))

        expect(await screen.findByText('We couldn’t send the email. Try again in a few minutes.')).toBeInTheDocument()
        expect(screen.queryByText(/Check your inbox/)).not.toBeInTheDocument()
        expect(screen.queryByText('SMTP timeout')).not.toBeInTheDocument()
    })
})
