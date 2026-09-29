import { screen } from '@testing-library/react'
import type { AuthContextValue } from '@/auth/AuthContext'
import { authClient, verifyEmail } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { memberAuth } from '@/test/auth'
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

const NEEDS_SIGN_IN_MESSAGE =
    'Your email is confirmed. Sign in to continue. Analyses you ran before signing up weren’t moved to this account.'

const ACCOUNT_LINK_FAILED = { status: 403, code: 'ACCOUNT_LINK_FAILED', message: 'Raw server text' }

const renderConfirmEmail = (token: string | null, auth: AuthContextValue = memberAuth()) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<ConfirmEmail token={token} />)
}

describe('ConfirmEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: null })
    })

    afterEach(() => jest.restoreAllMocks())

    it('confirms the email, refreshes the session and goes home', async () => {
        renderConfirmEmail(TOKEN)

        expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument()
        expect(verifyEmail).toHaveBeenCalledWith({ query: { token: TOKEN } })
        expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
        expect(mockReplace).toHaveBeenCalledWith('/')
    })

    it('explains a link without a token and never calls the API', async () => {
        const { user } = renderConfirmEmail(null)

        expect(screen.getByText('This link is invalid or has expired')).toBeInTheDocument()
        expect(verifyEmail).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('shows the copy for a refused token, not the server’s message, and stays signed in as it was', async () => {
        const auth = memberAuth()

        jest.mocked(verifyEmail).mockResolvedValueOnce({
            data: null,
            error: { status: 400, code: 'INVALID_TOKEN', message: 'Raw server text' },
        } as never)
        renderConfirmEmail(TOKEN, auth)

        expect(await screen.findByText('This link is invalid or has already been used.')).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
        expect(auth.signOut).not.toHaveBeenCalled()
        expect(mockReplace).not.toHaveBeenCalled()
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

    it('signs back out and asks the visitor to sign in when the history could not be moved', async () => {
        const auth = memberAuth()

        jest.mocked(verifyEmail).mockResolvedValueOnce({ data: null, error: ACCOUNT_LINK_FAILED } as never)
        const { user } = renderConfirmEmail(TOKEN, auth)

        expect(await screen.findByText(NEEDS_SIGN_IN_MESSAGE)).toBeInTheDocument()
        expect(auth.signOut).toHaveBeenCalledTimes(1)
        expect(mockReplace).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('retries a failed sign-out once, then reports it along with asking the visitor to sign in', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const auth = memberAuth()

        jest.mocked(auth.signOut).mockRejectedValue({ code: 'NETWORK_ERROR' })
        jest.mocked(verifyEmail).mockResolvedValueOnce({ data: null, error: ACCOUNT_LINK_FAILED } as never)
        renderConfirmEmail(TOKEN, auth)

        expect(await screen.findByText(NEEDS_SIGN_IN_MESSAGE)).toBeInTheDocument()
        expect(auth.signOut).toHaveBeenCalledTimes(2)
        expect(consoleError).toHaveBeenCalledTimes(2)
        expect(
            await screen.findByText('Couldn’t reach AdLens. Check your connection and try again.'),
        ).toBeInTheDocument()
    })

    it('shows no failure notice once a retried sign-out succeeds', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const auth = memberAuth()

        jest.mocked(auth.signOut).mockRejectedValueOnce({ code: 'NETWORK_ERROR' }).mockResolvedValueOnce(undefined)
        jest.mocked(verifyEmail).mockResolvedValueOnce({ data: null, error: ACCOUNT_LINK_FAILED } as never)
        renderConfirmEmail(TOKEN, auth)

        expect(await screen.findByText(NEEDS_SIGN_IN_MESSAGE)).toBeInTheDocument()
        expect(auth.signOut).toHaveBeenCalledTimes(2)
        expect(consoleError).toHaveBeenCalledTimes(1)
        expect(
            screen.queryByText('Couldn’t reach AdLens. Check your connection and try again.'),
        ).not.toBeInTheDocument()
    })

    it('treats a 403 with another code as an ordinary failure', async () => {
        const auth = memberAuth()

        jest.mocked(verifyEmail).mockResolvedValueOnce({
            data: null,
            error: { status: 403, code: 'INVALID_TOKEN' },
        } as never)
        renderConfirmEmail(TOKEN, auth)

        expect(await screen.findByText('This link is invalid or has already been used.')).toBeInTheDocument()
        expect(auth.signOut).not.toHaveBeenCalled()
    })
})
