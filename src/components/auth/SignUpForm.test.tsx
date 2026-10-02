import { authClient, signUp } from '@/auth/authClient'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor, within } from '@testing-library/react'
import { SignUpForm } from './SignUpForm'

jest.mock('@/auth/authClient', () => ({
    authClient: { getSession: jest.fn(async () => ({ data: null, error: null })), $store: { notify: jest.fn() } },
    signIn: { social: jest.fn(async () => ({ error: null })) },
    signUp: { email: jest.fn(async () => ({ error: null })) },
}))

const SIGN_UP_FIELDS = [
    ['Name', 'Ann'],
    ['Email', 'ann@example.com'],
    ['Password', 'long-enough-password'],
    ['Confirm password', 'long-enough-password'],
]

const ALREADY_IN_USE_COPY = 'This email is already in use. Sign in instead.'

const EMAIL_NOT_SENT_COPY = 'We couldn’t send the email. Try again in a few minutes.'

const NEW_ACCOUNT_SESSION = { user: { id: 'member-1', isAnonymous: false } }

const ANONYMOUS_SESSION = { user: { id: 'anon-1', isAnonymous: true } }

const failSignUpOnce = (error: object) =>
    jest.mocked(signUp.email).mockResolvedValueOnce({ data: null, error } as never)

const renderForm = () => renderWithProviders(<SignUpForm />)

// Pasted rather than typed: typing each character re-renders the form, which timed out under a full parallel run.
const submitSignUp = async (user: ReturnType<typeof renderForm>['user']) => {
    for (const [label, value] of SIGN_UP_FIELDS) {
        await user.click(screen.getByLabelText(label))
        await user.paste(value)
    }

    await user.click(screen.getByRole('button', { name: 'Create account' }))
}

// Each test fills the form and waits for antd's dialogs and alerts: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('SignUpForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'signup', isOtherAddressLink: false })
    })

    it('links every field to its label', () => {
        renderForm()

        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    })

    it('signs the new account up and opens the confirmation dialog', async () => {
        const { user } = renderForm()

        await submitSignUp(user)

        expect(signUp.email).toHaveBeenCalledWith({
            name: 'Ann',
            email: 'ann@example.com',
            password: 'long-enough-password',
        })
        await waitFor(() => expect(useAuthModalStore.getState().view).toBe('confirm'))
    })

    it('says an address already in use is taken, and offers sign-in instead', async () => {
        jest.mocked(signUp.email).mockResolvedValueOnce({
            data: null,
            error: { status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'Raw server text' },
        } as never)
        const { user } = renderForm()

        await submitSignUp(user)

        const alert = await screen.findByRole('alert')

        expect(within(alert).getByText(ALREADY_IN_USE_COPY)).toBeInTheDocument()
        expect(screen.queryByText('Raw server text')).not.toBeInTheDocument()
        expect(useAuthModalStore.getState().view).toBe('signup')

        await user.click(within(alert).getByRole('button', { name: 'Sign in' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    describe('when sign-up fails after the account was created', () => {
        it('opens the confirmation dialog, where the link can be resent, when the email couldn’t be sent', async () => {
            failSignUpOnce({ status: 503, code: 'EMAIL_NOT_SENT' })
            jest.mocked(authClient.getSession).mockResolvedValueOnce({
                data: NEW_ACCOUNT_SESSION,
                error: null,
            } as never)
            const { user } = renderForm()

            await submitSignUp(user)

            await waitFor(() => expect(useAuthModalStore.getState().view).toBe('confirm'))
            expect(await screen.findByText(EMAIL_NOT_SENT_COPY)).toBeInTheDocument()
            expect(authClient.$store.notify).toHaveBeenCalledWith('$sessionSignal')
        })

        it('says the earlier analyses weren’t moved, and still opens the confirmation dialog', async () => {
            failSignUpOnce({ status: 500, code: 'ACCOUNT_LINK_FAILED' })
            jest.mocked(authClient.getSession).mockResolvedValueOnce({
                data: NEW_ACCOUNT_SESSION,
                error: null,
            } as never)
            const { user } = renderForm()

            await submitSignUp(user)

            await waitFor(() => expect(useAuthModalStore.getState().view).toBe('confirm'))
            expect(
                await screen.findByText(
                    'You’re signed in, but your earlier analyses couldn’t be moved. Contact us and we’ll move them.',
                ),
            ).toBeInTheDocument()
        })

        it('keeps the form and the error when no account was signed in', async () => {
            failSignUpOnce({ status: 503, code: 'EMAIL_NOT_SENT' })
            const { user } = renderForm()

            await submitSignUp(user)

            const alert = await screen.findByRole('alert')

            expect(within(alert).getByText(EMAIL_NOT_SENT_COPY)).toBeInTheDocument()
            expect(useAuthModalStore.getState().view).toBe('signup')
        })

        it('keeps the form when the only session left is the visitor’s anonymous one', async () => {
            failSignUpOnce({ status: 503, code: 'EMAIL_NOT_SENT' })
            jest.mocked(authClient.getSession).mockResolvedValueOnce({
                data: ANONYMOUS_SESSION,
                error: null,
            } as never)
            const { user } = renderForm()

            await submitSignUp(user)

            const alert = await screen.findByRole('alert')

            expect(within(alert).getByText(EMAIL_NOT_SENT_COPY)).toBeInTheDocument()
            expect(authClient.getSession).toHaveBeenCalled()
            expect(useAuthModalStore.getState().view).toBe('signup')
            expect(authClient.$store.notify).not.toHaveBeenCalled()
        })
    })
})
