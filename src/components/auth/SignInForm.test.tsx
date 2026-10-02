import { authClient, signIn } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor, within } from '@testing-library/react'
import { SignInForm } from './SignInForm'

jest.mock('@/auth/authClient', () => ({
    authClient: { getSession: jest.fn(async () => ({ data: null, error: null })), $store: { notify: jest.fn() } },
    signIn: { email: jest.fn(async () => ({ error: null })), social: jest.fn(async () => ({ error: null })) },
}))

const NOT_MOVED_COPY = 'You’re signed in, but your earlier analyses couldn’t be moved. Contact us and we’ll move them.'

const renderForm = () => renderWithProviders(<SignInForm />)

const submitSignIn = async (user: ReturnType<typeof renderForm>['user']) => {
    await user.click(screen.getByLabelText('Email'))
    await user.paste('ann@example.com')
    await user.click(screen.getByLabelText('Password'))
    await user.paste('long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'signin', isOtherAddressLink: false })
    })

    it('links every field to its label', () => {
        renderForm()

        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('signs in and closes the dialog', async () => {
        const { user } = renderForm()

        await submitSignIn(user)

        await waitFor(() => expect(useAuthModalStore.getState().view).toBeNull())
        expect(signIn.email).toHaveBeenCalledWith({ email: 'ann@example.com', password: 'long-enough-password' })
    })

    it('closes the dialog and says so when the earlier analyses couldn’t be moved to the signed-in account', async () => {
        jest.mocked(signIn.email).mockResolvedValueOnce({
            data: null,
            error: { status: 500, code: 'ACCOUNT_LINK_FAILED' },
        } as never)
        jest.mocked(authClient.getSession).mockResolvedValueOnce({
            data: { user: { id: 'member-1', isAnonymous: false } },
            error: null,
        } as never)
        const { user } = renderForm()

        await submitSignIn(user)

        await waitFor(() => expect(useAuthModalStore.getState().view).toBeNull())
        expect(await screen.findByText(NOT_MOVED_COPY)).toBeInTheDocument()
        expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
    })

    it('keeps the form and shows the copy for a refused sign-in', async () => {
        jest.mocked(signIn.email).mockResolvedValueOnce({
            data: null,
            error: { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Raw server text' },
        } as never)
        const { user } = renderForm()

        await submitSignIn(user)

        const alert = await screen.findByRole('alert')

        expect(within(alert).getByText('Wrong email or password.')).toBeInTheDocument()
        expect(authClient.getSession).not.toHaveBeenCalled()
        expect(useAuthModalStore.getState().view).toBe('signin')
    })
})
