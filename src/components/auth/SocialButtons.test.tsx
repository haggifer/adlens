import { screen } from '@testing-library/react'
import { signIn } from '@/auth/authClient'
import { renderWithProviders } from '@/test/render'
import { SocialButtons } from './SocialButtons'

jest.mock('@/auth/authClient', () => ({ signIn: { social: jest.fn(async () => ({ error: null })) } }))

const googleButton = () => screen.getByRole('button', { name: /continue with google/i })

const githubButton = () => screen.getByRole('button', { name: /continue with github/i })

describe('SocialButtons', () => {
    beforeEach(() => jest.mocked(signIn.social).mockClear())

    afterEach(() => jest.restoreAllMocks())

    it('starts Google sign-in and comes back to the current page, whether it succeeds or fails', async () => {
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())

        expect(signIn.social).toHaveBeenCalledWith({
            provider: 'google',
            callbackURL: window.location.href,
            errorCallbackURL: window.location.href,
        })
    })

    it('starts GitHub sign-in and keeps the other provider unavailable while it redirects', async () => {
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(githubButton())

        expect(signIn.social).toHaveBeenCalledWith(expect.objectContaining({ provider: 'github' }))
        expect(googleButton()).toBeDisabled()
    })

    it('shows the reason when the API refuses to start the sign-in, and lets the visitor try again', async () => {
        jest.mocked(signIn.social).mockResolvedValueOnce({ error: { status: 429 } } as never)
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(googleButton())

        expect(await screen.findByText('Too many attempts. Wait a minute and try again.')).toBeInTheDocument()
        expect(googleButton()).toBeEnabled()
        expect(githubButton()).toBeEnabled()
    })

    it('shows a connection problem when the API can’t be reached', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.mocked(signIn.social).mockRejectedValueOnce(new TypeError('Failed to fetch'))
        const { user } = renderWithProviders(<SocialButtons />)

        await user.click(githubButton())

        expect(
            await screen.findByText('Couldn’t reach AdLens. Check your connection and try again.'),
        ).toBeInTheDocument()
        expect(consoleError).toHaveBeenCalled()
    })
})
