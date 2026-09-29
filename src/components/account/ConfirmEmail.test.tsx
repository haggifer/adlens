import { render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { verifyEmail } from '@/auth/authClient'
import { ConfirmEmail } from './ConfirmEmail'

const push = jest.fn()
const signOut = jest.fn(async () => undefined)

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: push }) }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    verifyEmail: jest.fn(),
}))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ signOut }) }))

const renderConfirmEmail = (token: string | null) =>
    render(
        <App>
            <ConfirmEmail token={token} />
        </App>,
    )

describe('ConfirmEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        signOut.mockResolvedValue(undefined)
    })

    it('signs back out and asks the visitor to sign in when the history could not be moved', async () => {
        jest.mocked(verifyEmail).mockResolvedValueOnce({
            error: { status: 403, code: 'ACCOUNT_LINK_FAILED', message: 'nope' },
        })
        renderConfirmEmail('a-token')

        await waitFor(() =>
            expect(
                screen.getByText(
                    'Your email is confirmed. Sign in to continue. Analyses you ran before signing up weren’t moved to this account.',
                ),
            ).toBeInTheDocument(),
        )
        expect(signOut).toHaveBeenCalled()
        expect(push).not.toHaveBeenCalled()
    })

    it('still asks the visitor to sign in when signing out keeps failing, after one retry', async () => {
        signOut.mockRejectedValue(new Error('network down'))
        jest.mocked(verifyEmail).mockResolvedValueOnce({
            error: { status: 403, code: 'ACCOUNT_LINK_FAILED', message: 'nope' },
        })
        renderConfirmEmail('a-token')

        await waitFor(() =>
            expect(
                screen.getByText(
                    'Your email is confirmed. Sign in to continue. Analyses you ran before signing up weren’t moved to this account.',
                ),
            ).toBeInTheDocument(),
        )
        expect(signOut).toHaveBeenCalledTimes(2)
    })

    it('keeps the existing behaviour for other failures', async () => {
        jest.mocked(verifyEmail).mockResolvedValueOnce({
            error: { status: 400, code: 'INVALID_TOKEN', message: 'nope' },
        })
        renderConfirmEmail('a-token')

        await waitFor(() =>
            expect(screen.getByText('This link is invalid or has already been used.')).toBeInTheDocument(),
        )
        expect(signOut).not.toHaveBeenCalled()
    })
})
