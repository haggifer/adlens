import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { requestPasswordReset } from '@/auth/authClient'
import { SetPasswordSection } from './SetPasswordSection'

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ user: { email: 'social@example.com' } }) }))
jest.mock('@/auth/authClient', () => ({ requestPasswordReset: jest.fn(async () => ({ error: null })) }))

describe('SetPasswordSection', () => {
    it('emails the user a link to set a password', async () => {
        render(
            <App>
                <SetPasswordSection />
            </App>,
        )

        await userEvent.click(screen.getByRole('button', { name: /email me a link/i }))

        await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'social@example.com' }))
        expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
    })
})
