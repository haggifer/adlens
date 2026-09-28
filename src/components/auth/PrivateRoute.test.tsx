import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { PrivateRoute } from './PrivateRoute'

jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => ({ isInitializing: false, isSignedIn: true, isAnonymous: true }),
}))

describe('PrivateRoute', () => {
    beforeEach(() => useAuthModalStore.setState({ view: null }))

    it('shows an anonymous visitor their own pages, such as History', () => {
        render(
            <PrivateRoute>
                <p>Your analyses</p>
            </PrivateRoute>,
        )

        expect(screen.getByText('Your analyses')).toBeInTheDocument()
    })

    it('asks an anonymous visitor to sign up for a page that needs an account', async () => {
        render(
            <PrivateRoute isAccountOnly>
                <p>Account settings</p>
            </PrivateRoute>,
        )

        expect(screen.queryByText('Account settings')).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }))

        expect(useAuthModalStore.getState().view).toBe('signup')
    })
})
