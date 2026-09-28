import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { signIn } from '@/auth/authClient'
import { SocialButtons } from './SocialButtons'

jest.mock('@/auth/authClient', () => ({ signIn: { social: jest.fn(async () => ({ error: null })) } }))

const renderButtons = () =>
    render(
        <App>
            <SocialButtons />
        </App>,
    )

describe('SocialButtons', () => {
    beforeEach(() => jest.mocked(signIn.social).mockClear())

    it('starts Google sign-in and comes back to the current page, even after an error', async () => {
        renderButtons()

        await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

        expect(signIn.social).toHaveBeenCalledWith({
            provider: 'google',
            callbackURL: window.location.href,
            errorCallbackURL: window.location.href,
        })
    })

    it('starts GitHub sign-in', async () => {
        renderButtons()

        await userEvent.click(screen.getByRole('button', { name: /continue with github/i }))

        expect(signIn.social).toHaveBeenCalledWith(expect.objectContaining({ provider: 'github' }))
    })

    it('shows the reason when the sign-in can’t start', async () => {
        jest.mocked(signIn.social).mockResolvedValueOnce({ error: { status: 429 } } as never)
        renderButtons()

        await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

        expect(await screen.findByText('Too many attempts. Wait a minute and try again.')).toBeInTheDocument()
    })
})
