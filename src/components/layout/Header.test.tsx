import type { AuthContextValue } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen, within } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import { Header } from './Header'

const mockUseAuth = jest.fn<AuthContextValue, []>()
let mockQuota: Quota | undefined

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: mockQuota }) }))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const QUOTA: Quota = { used: 1, limit: 3, nextFreeAt: null }

const renderHeader = (auth: AuthContextValue, quota?: Quota) => {
    mockUseAuth.mockReturnValue(auth)
    mockQuota = quota
    renderWithProviders(<Header />)
}

describe('Header', () => {
    it('shows a member the navigation, how many analyses are left and the account menu', () => {
        renderHeader(memberAuth(), QUOTA)

        expect(screen.getByRole('link', { name: 'Examples' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
        expect(screen.getByText('2/3 analyses left')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument()
    })

    it('orders the navigation Analyze, History, Examples', () => {
        renderHeader(memberAuth(), QUOTA)

        const nav = screen.getByRole('navigation', { name: 'Main' })

        expect(
            within(nav)
                .getAllByRole('link')
                .map((link) => link.textContent),
        ).toEqual(['Analyze', 'History', 'Examples'])
    })

    it('marks the current page in the navigation', () => {
        renderHeader(memberAuth(), QUOTA)

        expect(screen.getByRole('link', { name: 'Analyze' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'History' })).not.toHaveAttribute('aria-current')
    })

    // A quota is given even here, so the count is hidden by the sign-in check, not by a missing quota.
    it('shows a signed-out visitor Sign In and the public pages: no History and no count', () => {
        renderHeader(signedOutAuth(), QUOTA)

        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Analyze' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Examples' })).toHaveAttribute('href', '/demo')
        expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument()
        expect(screen.queryByText(/analyses left/)).not.toBeInTheDocument()
    })

    it('offers an anonymous visitor only Sign In: no account menu and no count', () => {
        renderHeader(anonymousAuth(), { used: 1, limit: 1, nextFreeAt: null })

        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
        expect(screen.queryByText(/analyses left/)).not.toBeInTheDocument()
    })

    it('offers an account whose email isn’t confirmed a Confirm email button instead of the account menu', () => {
        renderHeader(unconfirmedAuth(), { used: 0, limit: 1, nextFreeAt: null })

        expect(screen.getByRole('button', { name: 'Confirm email' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
        expect(screen.getByText('1/1 analyses left')).toBeInTheDocument()
    })

    it('draws Sign In at once while the session loads and nothing is remembered, but inert', () => {
        renderHeader(initializingAuth())

        const signIn = screen.getByRole('button', { name: 'Sign In' })

        expect(signIn).toHaveAttribute('aria-disabled', 'true')
        expect(signIn).not.toHaveAttribute('disabled')
        expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument()
    })

    it('takes the shape of a remembered member while the session loads, with an inert avatar', () => {
        renderHeader(initializingAuth(AccountKind.Member))

        expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute('aria-disabled', 'true')
    })

    it('shows no count before the quota has loaded', () => {
        renderHeader(memberAuth())

        expect(screen.queryByText(/analyses left/)).not.toBeInTheDocument()
    })
})
