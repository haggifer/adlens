import { verifyEmail } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { describeConfirmError, describeError } from '@/auth/errors'
import { announceSessionChange, refreshSession } from '@/auth/session'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { ConfirmEmail } from './ConfirmEmail'

const mockReplace = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock('@/auth/authClient', () => ({
    verifyEmail: jest.fn(async () => ({ data: { status: true }, error: null })),
}))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/session', () => ({ announceSessionChange: jest.fn(), refreshSession: jest.fn() }))

const TOKEN = 'a-token'

const SIGN_IN_REQUIRED = { status: 401, code: 'SIGN_IN_REQUIRED', message: 'Raw server text' }

const EMAIL_MISMATCH = { status: 403, code: 'EMAIL_MISMATCH', message: 'Raw server text' }

const SIGN_IN_PROMPT = describeError({ code: 'SIGN_IN_REQUIRED' })

const MISMATCH_COPY = describeError({ code: 'EMAIL_MISMATCH' })

const renderConfirmEmail = (token: string | null, auth: AuthContextValue = unconfirmedAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<ConfirmEmail token={token} />)
}

const answerOnce = (error: object) => jest.mocked(verifyEmail).mockResolvedValueOnce({ data: null, error } as never)

describe('ConfirmEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: null, isOtherAddressLink: false })
    })

    afterEach(() => jest.restoreAllMocks())

    it('confirms the email, refreshes the session in this tab and the others, and stays to say so', async () => {
        const { user } = renderConfirmEmail(TOKEN)

        expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument()
        expect(screen.getByText(/close this tab/)).toBeInTheDocument()
        expect(verifyEmail).toHaveBeenCalledWith({ query: { token: TOKEN } })
        expect(refreshSession).toHaveBeenCalled()
        expect(announceSessionChange).toHaveBeenCalled()
        // Going home would show an empty workspace, as if the video and settings in the other tab were lost.
        expect(mockReplace).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Start a new analysis' }))

        expect(mockReplace).toHaveBeenCalledWith('/')
    })

    it('sends the token once, even when React runs the effect twice', async () => {
        mockUseAuth.mockReturnValue(unconfirmedAuth())
        renderWithProviders(
            <StrictMode>
                <ConfirmEmail token={TOKEN} />
            </StrictMode>,
        )

        expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument()
        expect(verifyEmail).toHaveBeenCalledTimes(1)
    })

    it('waits for the session to load before sending the token', () => {
        renderConfirmEmail(TOKEN, initializingAuth())

        expect(screen.getByText('Confirming your email…')).toBeInTheDocument()
        expect(verifyEmail).not.toHaveBeenCalled()
    })

    it('explains a link without a token and never calls the API', () => {
        renderConfirmEmail(null, signedOutAuth())

        expect(screen.getByText('This link is invalid or has expired')).toBeInTheDocument()
        expect(verifyEmail).not.toHaveBeenCalled()
    })

    it('shows the copy for a refused token, not the server’s message, and offers a new link', async () => {
        const refused = { status: 400, code: 'INVALID_TOKEN', message: 'Raw server text' }

        answerOnce(refused)
        const { user } = renderConfirmEmail(TOKEN)

        expect(await screen.findByText(describeConfirmError(refused))).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Confirm email' }))

        expect(useAuthModalStore.getState().view).toBe('confirm')
    })

    it('tells an account whose mailbox another account already confirmed to sign in to that one, with no new link', async () => {
        const mailboxTaken = { status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'Raw server text' }

        answerOnce(mailboxTaken)
        renderConfirmEmail(TOKEN)

        expect(await screen.findByText(describeConfirmError(mailboxTaken))).toBeInTheDocument()
        expect(screen.queryByText(describeError(mailboxTaken))).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Confirm email' })).not.toBeInTheDocument()
    })

    it('treats a 403 with another code as an ordinary failure', async () => {
        answerOnce({ status: 403, code: 'INVALID_TOKEN' })
        renderConfirmEmail(TOKEN)

        expect(await screen.findByText('This link is invalid or has already been used.')).toBeInTheDocument()
        expect(useAuthModalStore.getState().view).toBeNull()
    })

    it('shows a connection problem when the API can’t be reached', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(verifyEmail).mockRejectedValueOnce(new TypeError('Failed to fetch'))
        renderConfirmEmail(TOKEN)

        expect(await screen.findByText(describeError({ code: 'NETWORK_ERROR' }))).toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('tells a signed-out visitor with a refused token to sign in for a new link', async () => {
        const expired = { status: 400, code: 'TOKEN_EXPIRED' }

        answerOnce(expired)
        const { user } = renderConfirmEmail(TOKEN, signedOutAuth())

        expect(await screen.findByText(describeConfirmError(expired))).toBeInTheDocument()
        expect(screen.getByText('Sign in, then use Confirm email to get a new link.')).toBeInTheDocument()
        expect(useAuthModalStore.getState().view).toBeNull()

        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it.each(['TOKEN_EXPIRED', 'INVALID_TOKEN'])(
        'tells a confirmed member whose link was refused (%s) that their email is already confirmed',
        async (code) => {
            answerOnce({ status: 400, code })
            const { user } = renderConfirmEmail(TOKEN, memberAuth())

            expect(await screen.findByText('Your email is already confirmed')).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Go to the home page' }))

            expect(mockReplace).toHaveBeenCalledWith('/')
        },
    )

    describe('without a session that owns the link', () => {
        it('opens sign-in, then confirms the same token once the user has signed in', async () => {
            answerOnce(SIGN_IN_REQUIRED)
            const { rerender } = renderConfirmEmail(TOKEN, signedOutAuth())

            expect(await screen.findByText(SIGN_IN_PROMPT)).toBeInTheDocument()
            expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
            expect(useAuthModalStore.getState().view).toBe('signin')

            mockUseAuth.mockReturnValue(unconfirmedAuth())
            rerender(<ConfirmEmail token={TOKEN} />)

            expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument()
            expect(verifyEmail).toHaveBeenCalledTimes(2)
            expect(verifyEmail).toHaveBeenLastCalledWith({ query: { token: TOKEN } })
        })

        it('asks an anonymous session to sign in too, and doesn’t retry until it has', async () => {
            answerOnce(SIGN_IN_REQUIRED)
            const { rerender } = renderConfirmEmail(TOKEN, anonymousAuth())

            expect(await screen.findByText(SIGN_IN_PROMPT)).toBeInTheDocument()

            rerender(<ConfirmEmail token={TOKEN} />)

            expect(verifyEmail).toHaveBeenCalledTimes(1)
        })

        it('reopens sign-in from the page after the dialog was closed', async () => {
            answerOnce(SIGN_IN_REQUIRED)
            const { user } = renderConfirmEmail(TOKEN, signedOutAuth())

            await screen.findByText(SIGN_IN_PROMPT)
            useAuthModalStore.getState().setView(null)
            await user.click(screen.getByRole('button', { name: 'Sign in' }))

            expect(useAuthModalStore.getState().view).toBe('signin')
        })

        it('stops asking when the API still wants a sign-in after one', async () => {
            answerOnce(SIGN_IN_REQUIRED)
            answerOnce(SIGN_IN_REQUIRED)
            const { rerender } = renderConfirmEmail(TOKEN, signedOutAuth())

            await screen.findByText(SIGN_IN_PROMPT)
            mockUseAuth.mockReturnValue(memberAuth())
            rerender(<ConfirmEmail token={TOKEN} />)

            expect(await screen.findByText(SIGN_IN_PROMPT)).toBeInTheDocument()
            expect(screen.queryByText('Confirming your email…')).not.toBeInTheDocument()
            expect(verifyEmail).toHaveBeenCalledTimes(2)
        })
    })

    describe('signed in as another account', () => {
        it('reopens an unconfirmed user’s own “Check your inbox”, noting the link is for another address', async () => {
            answerOnce(EMAIL_MISMATCH)
            renderConfirmEmail(TOKEN, unconfirmedAuth())

            expect(await screen.findByText(MISMATCH_COPY)).toBeInTheDocument()
            expect(useAuthModalStore.getState()).toMatchObject({ view: 'confirm', isOtherAddressLink: true })
            expect(mockReplace).not.toHaveBeenCalled()
        })

        it('tells a confirmed member to sign out first, without opening a dialog', async () => {
            answerOnce(EMAIL_MISMATCH)
            renderConfirmEmail(TOKEN, memberAuth())

            expect(await screen.findByText(MISMATCH_COPY)).toBeInTheDocument()
            expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
            expect(useAuthModalStore.getState().view).toBeNull()
            expect(screen.queryByRole('button', { name: 'Check your inbox' })).not.toBeInTheDocument()
        })
    })
})
