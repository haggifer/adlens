import { signIn } from '@/auth/authClient'
import { refreshSession } from '@/auth/session'
import { postSocialSignInOutcome, takeRedirectSignIn } from '@/auth/social-sign-in'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { SocialButtons } from './SocialButtons'

jest.mock('@/auth/authClient', () => ({
    signIn: { social: jest.fn(async () => ({ data: { url: MOCK_PROVIDER_URL, redirect: false }, error: null })) },
}))
jest.mock('@/auth/session', () => ({ refreshSession: jest.fn() }))

const MOCK_PROVIDER_URL = 'https://accounts.google.com/o/oauth2/auth?state=abc'
const DONE_URL = `${window.location.origin}/auth/done`

const googleButton = () => screen.getByRole('button', { name: /continue with google/i })

const githubButton = () => screen.getByRole('button', { name: /continue with github/i })

const createPopup = () => ({ location: { href: '' }, focus: jest.fn(), close: jest.fn() })

describe('SocialButtons', () => {
    let popup: ReturnType<typeof createPopup>
    let open: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'signin', isOtherAddressLink: false })
        popup = createPopup()
        open = jest.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    })

    afterEach(() => jest.restoreAllMocks())

    it('opens the provider in a popup and keeps this page as it is', async () => {
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())

        expect(open).toHaveBeenCalledWith('', expect.any(String), expect.stringMatching(/width=\d+,height=\d+/))
        expect(signIn.social).toHaveBeenCalledWith({
            provider: 'google',
            callbackURL: DONE_URL,
            errorCallbackURL: DONE_URL,
            disableRedirect: true,
        })
        await waitFor(() => expect(popup.location.href).toBe(MOCK_PROVIDER_URL))
    })

    it('signs in in this tab, back to the current page, when the browser blocks the popup', async () => {
        open.mockReturnValue(null)
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(githubButton())

        expect(signIn.social).toHaveBeenCalledWith({
            provider: 'github',
            callbackURL: window.location.href,
            errorCallbackURL: window.location.href,
        })
        // So the page it comes back to explains an ?error=.
        expect(takeRedirectSignIn()).toBe(true)
    })

    it('lets the visitor start over with either provider while the popup is open', async () => {
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())
        await user.click(githubButton())
        await user.click(googleButton())

        expect(open).toHaveBeenCalledTimes(3)
        expect(signIn.social).toHaveBeenLastCalledWith(expect.objectContaining({ provider: 'google' }))
    })

    it('stops the spinner once this window has focus again, and still takes a sign-in finished later', async () => {
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())
        expect(googleButton()).toHaveAttribute('aria-busy', 'true')

        fireEvent.focus(window)

        expect(googleButton()).toHaveAttribute('aria-busy', 'false')

        postSocialSignInOutcome({ errorCode: null })

        await waitFor(() => expect(useAuthModalStore.getState().view).toBeNull())
    })

    it('closes the dialog once the popup reports the user signed in', async () => {
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())
        postSocialSignInOutcome({ errorCode: null })

        await waitFor(() => expect(useAuthModalStore.getState().view).toBeNull())
        expect(refreshSession).toHaveBeenCalled()
    })

    it('closes the popup and shows the reason when the API refuses to start the sign-in', async () => {
        jest.mocked(signIn.social).mockResolvedValueOnce({ data: null, error: { status: 429 } } as never)
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())

        expect(await screen.findByText('Too many attempts. Wait a minute and try again.')).toBeInTheDocument()
        expect(popup.close).toHaveBeenCalled()
        expect(popup.location.href).toBe('')
    })

    it('shows a connection problem when the API can’t be reached', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(signIn.social).mockRejectedValueOnce(new TypeError('Failed to fetch'))
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(githubButton())

        expect(
            await screen.findByText('Couldn’t reach AdLens. Check your connection and try again.'),
        ).toBeInTheDocument()
        expect(popup.close).toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()
    })

    it('shows the reason when the API refuses a sign-in in this tab', async () => {
        open.mockReturnValue(null)
        jest.mocked(signIn.social).mockResolvedValueOnce({ data: null, error: { status: 429 } } as never)
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())

        expect(await screen.findByText('Too many attempts. Wait a minute and try again.')).toBeInTheDocument()
        expect(googleButton()).toBeEnabled()
        expect(takeRedirectSignIn()).toBe(false)
    })
})
