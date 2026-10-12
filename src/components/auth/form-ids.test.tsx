import { ChangePasswordForm } from '@/components/account/ChangePasswordForm'
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm'
import { memberAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { ForgotForm } from './ForgotForm'
import { ResetPasswordForm } from './ResetPasswordForm'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => memberAuth() }))
jest.mock('@/auth/authClient', () => ({
    authClient: { $store: { notify: jest.fn() } },
    changePassword: jest.fn(async () => ({ error: null })),
    deleteUser: jest.fn(async () => ({ error: null })),
    requestPasswordReset: jest.fn(async () => ({ error: null })),
    resetPassword: jest.fn(async () => ({ error: null })),
    signIn: { email: jest.fn(async () => ({ error: null })), social: jest.fn(async () => ({ error: null })) },
    signUp: { email: jest.fn(async () => ({ error: null })) },
}))

// The sign-in and sign-up modals, and an account settings page, can all be on screen together; every field id must
// stay unique across them or a label points at the wrong input.
describe('auth and account form ids', () => {
    it('never repeats an id when every form is mounted at once', () => {
        const { container } = renderWithProviders(
            <>
                <SignInForm />
                <SignUpForm />
                <ForgotForm />
                <ChangePasswordForm />
                <ResetPasswordForm />
                <DeleteAccountForm hasPassword />
            </>,
        )

        const ids = Array.from(container.querySelectorAll('[id]')).map((element) => element.id)
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)

        expect(duplicates).toEqual([])
    })
})
