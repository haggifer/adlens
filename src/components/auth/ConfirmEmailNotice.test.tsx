import { authClient, sendVerificationEmail } from '@/auth/authClient'
import type { AuthContextValue } from '@/auth/AuthContext'
import { describeError } from '@/auth/errors'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { MEMBER_EMAIL, memberAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { AuthModal } from './AuthModal'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    sendVerificationEmail: jest.fn(async () => ({ data: { status: true }, error: null })),
}))

const OTHER_ADDRESS_NOTE = 'The link you opened is for a different address.'

const openConfirmation = (auth: AuthContextValue = memberAuth(), isOtherAddressLink = false) => {
    mockUseAuth.mockReturnValue(auth)
    useAuthModalStore.getState().setView('confirm')
    useAuthModalStore.getState().setIsOtherAddressLink(isOtherAddressLink)

    return renderWithProviders(<AuthModal />)
}

describe('ConfirmEmailNotice', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: null, isOtherAddressLink: false })
    })

    it('tells the user where the link went', async () => {
        openConfirmation()

        expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
        expect(screen.getByText(new RegExp(MEMBER_EMAIL))).toBeInTheDocument()
        expect(screen.queryByText(OTHER_ADDRESS_NOTE)).not.toBeInTheDocument()
    })

    it('resends the email to the signed-in address', async () => {
        const { user } = openConfirmation()

        await user.click(await screen.findByRole('button', { name: 'Resend email' }))

        expect(sendVerificationEmail).toHaveBeenCalledWith({ email: MEMBER_EMAIL })
        expect(await screen.findByText('We sent you a new link')).toBeInTheDocument()
    })

    it('shows the rate-limit copy, not the server’s message, when resending too often', async () => {
        jest.mocked(sendVerificationEmail).mockResolvedValueOnce({
            data: null,
            error: { status: 429, message: 'Raw server text' },
        } as never)
        const { user } = openConfirmation()

        await user.click(await screen.findByRole('button', { name: 'Resend email' }))

        expect(await screen.findByText(describeError({ status: 429 }))).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
    })

    it('refreshes the session and closes the dialog when the email was confirmed elsewhere', async () => {
        jest.mocked(sendVerificationEmail).mockResolvedValueOnce({
            data: null,
            error: { status: 400, code: 'EMAIL_ALREADY_VERIFIED', message: 'Raw server text' },
        } as never)
        const { user } = openConfirmation(unconfirmedAuth())

        await user.click(await screen.findByRole('button', { name: 'Resend email' }))

        expect(await screen.findByText(describeError({ code: 'EMAIL_ALREADY_VERIFIED' }))).toBeInTheDocument()
        expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
        expect(useAuthModalStore.getState().view).toBeNull()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
    })

    it('closes and says the email is confirmed once it’s confirmed in another tab', async () => {
        const { rerender } = openConfirmation(unconfirmedAuth())

        expect(await screen.findByText('Check your inbox')).toBeInTheDocument()

        mockUseAuth.mockReturnValue(memberAuth())
        rerender(<AuthModal />)

        expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument()
        expect(useAuthModalStore.getState().view).toBeNull()
    })

    it('stays open for an account already confirmed when it opened', async () => {
        openConfirmation(memberAuth())

        expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
        expect(screen.queryByText('Your email is confirmed')).not.toBeInTheDocument()
        expect(useAuthModalStore.getState().view).toBe('confirm')
    })

    it('says so when the user opened a link for another address', async () => {
        openConfirmation(memberAuth(), true)

        expect(await screen.findByText(OTHER_ADDRESS_NOTE)).toBeInTheDocument()
    })

    it('drops the note once another view opens', () => {
        useAuthModalStore.getState().setView('confirm')
        useAuthModalStore.getState().setIsOtherAddressLink(true)
        useAuthModalStore.getState().setView('signin')

        expect(useAuthModalStore.getState().isOtherAddressLink).toBe(false)
    })
})
