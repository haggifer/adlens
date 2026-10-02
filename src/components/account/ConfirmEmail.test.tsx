import { screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import type { AuthContextValue } from '@/auth/AuthContext'
import { authClient, verifyEmail } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { ConfirmEmail } from './ConfirmEmail'

const mockReplace = jest.fn()
const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    verifyEmail: jest.fn(async () => ({ data: { status: true }, error: null })),
}))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

const TOKEN = 'a-token'

const SIGN_IN_REQUIRED = { status: 401, code: 'SIGN_IN_REQUIRED', message: 'Raw server text' }

const EMAIL_MISMATCH = { status: 403, code: 'EMAIL_MISMATCH', message: 'Raw server text' }

const SIGN_IN_PROMPT = 'Sign in to confirm your email.'

const MISMATCH_COPY = 'This link is for a different account. Sign out, then open it again.'

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

    it('confirms the email, refreshes the session and the limits, and goes home', async () => {
        const { queryClient } = renderConfirmEmail(TOKEN)
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

        expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument()
        expect(verifyEmail).toHaveBeenCalledWith({ query: { token: TOKEN } })
        expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['quota'] })
        expect(mockReplace).toHaveBeenCalledWith('/')
    })

    it('sends the token once, even when React runs the effect twice', async () => {
        mockUseAuth.mockReturnValue(unconfirmedAuth())
        renderWithProviders(
            <StrictMode>
                <ConfirmEmail token={TOKEN} />
            </StrictMode>,
        )

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
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
        answerOnce({ status: 400, code: 'INVALID_TOKEN', message: 'Raw server text' })
        const { user } = renderConfirmEmail(TOKEN)

        expect(await screen.findByText('This link is invalid or has already been used.')).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Confirm email' }))

        expect(useAuthModalStore.getState().view).toBe('confirm')
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

        expect(
            await screen.findByText('Couldn’t reach AdLens. Check your connection and try again.'),
        ).toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('tells a signed-out visitor with a refused token to sign in for a new link', async () => {
        answerOnce({ status: 400, code: 'TOKEN_EXPIRED' })
        const { user } = renderConfirmEmail(TOKEN, signedOutAuth())

        expect(await screen.findByText('This link has expired. Request a new one.')).toBeInTheDocument()
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
            expect(mockReplace).toHaveBeenCalledWith('/')
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
