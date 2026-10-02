import type { AuthContextValue } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivateRoute } from './PrivateRoute'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

const PAGE_CONTENT = 'Page content'

const renderRoute = (auth: AuthContextValue, isAccountOnly?: boolean) => {
    mockUseAuth.mockReturnValue(auth)
    render(
        <PrivateRoute isAccountOnly={isAccountOnly}>
            <p>{PAGE_CONTENT}</p>
        </PrivateRoute>,
    )
}

describe('PrivateRoute', () => {
    beforeEach(() => useAuthModalStore.setState({ view: null }))

    it('shows neither the page nor a sign-in prompt while the session loads', () => {
        renderRoute(initializingAuth())

        expect(screen.getByText('Checking your session…')).toBeInTheDocument()
        expect(screen.queryByText(PAGE_CONTENT)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
    })

    it('asks a signed-out visitor to sign in', async () => {
        renderRoute(signedOutAuth())

        expect(screen.queryByText(PAGE_CONTENT)).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('shows an anonymous visitor their own pages, such as History', () => {
        renderRoute(anonymousAuth())

        expect(screen.getByText(PAGE_CONTENT)).toBeInTheDocument()
    })

    it('asks an anonymous visitor to sign up for a page that needs an account', async () => {
        renderRoute(anonymousAuth(), true)

        expect(screen.queryByText(PAGE_CONTENT)).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }))

        expect(useAuthModalStore.getState().view).toBe('signup')
    })

    it('lets an anonymous visitor who already has an account sign in from a page that needs one', async () => {
        renderRoute(anonymousAuth(), true)

        await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('shows an account whose email isn’t confirmed its own pages, such as History', () => {
        renderRoute(unconfirmedAuth())

        expect(screen.getByText(PAGE_CONTENT)).toBeInTheDocument()
    })

    it('asks an account whose email isn’t confirmed to confirm it before a page that needs a full account', async () => {
        renderRoute(unconfirmedAuth(), true)

        expect(screen.queryByText(PAGE_CONTENT)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Confirm email' }))

        expect(useAuthModalStore.getState().view).toBe('confirm')
    })

    it('shows a member a page that needs an account', () => {
        renderRoute(memberAuth(), true)

        expect(screen.getByText(PAGE_CONTENT)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument()
    })
})
