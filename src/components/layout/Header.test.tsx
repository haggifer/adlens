import type { AuthContextValue } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { anonymousAuth, initializingAuth, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import { Header } from './Header'
import { describeNextFree, formatQuotaLeft } from './quota-label'

const mockUseAuth = jest.fn<AuthContextValue, []>()
let mockQuota: Quota | undefined

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: mockQuota }) }))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const QUOTA: Quota = { used: 1, limit: 3, nextFreeAt: null }

const NEXT_FREE_AT = '2026-10-16T09:30:00.000Z'

const renderHeader = (auth: AuthContextValue, quota?: Quota) => {
    mockUseAuth.mockReturnValue(auth)
    mockQuota = quota

    return renderWithProviders(<Header />)
}

describe('Header', () => {
    it('shows a member the navigation, how many analyses are left and the account menu', () => {
        renderHeader(memberAuth(), QUOTA)

        expect(screen.getByRole('link', { name: 'Examples' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
        expect(screen.getByText(formatQuotaLeft(QUOTA))).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument()
    })

    it('marks the current page in the navigation', () => {
        renderHeader(memberAuth(), QUOTA)

        expect(screen.getByRole('link', { name: 'Analyze' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'History' })).not.toHaveAttribute('aria-current')
    })

    // A quota is given even here, so the count is hidden by the sign-in check, not by a missing quota.
    it('shows a signed-out visitor Sign In and the public pages: Presets, but no History and no count', () => {
        renderHeader(signedOutAuth(), QUOTA)

        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Analyze' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Examples' })).toHaveAttribute('href', '/demo')
        expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Presets' })).toHaveAttribute('href', '/presets')
        expect(screen.queryByText(formatQuotaLeft(QUOTA))).not.toBeInTheDocument()
    })

    it('offers an anonymous visitor only Sign In: no account menu and no count', () => {
        const quota: Quota = { used: 1, limit: 1, nextFreeAt: null }

        renderHeader(anonymousAuth(), quota)

        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
        expect(screen.queryByText(formatQuotaLeft(quota))).not.toBeInTheDocument()
    })

    it('offers an account whose email isn’t confirmed a Confirm email button instead of the account menu', () => {
        const quota: Quota = { used: 0, limit: 1, nextFreeAt: null }

        renderHeader(unconfirmedAuth(), quota)

        expect(screen.getByRole('button', { name: 'Confirm email' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
        expect(screen.getByText(formatQuotaLeft(quota))).toBeInTheDocument()
    })

    it('links no History while the session loads and nothing is remembered', () => {
        renderHeader(initializingAuth())

        expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument()
    })

    it('links History while the session loads as a remembered member', () => {
        renderHeader(initializingAuth(AccountKind.Member))

        expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
    })

    it('shows no count before the quota has loaded', () => {
        renderHeader(memberAuth())

        expect(screen.queryByText(/analyses left/)).not.toBeInTheDocument()
    })

    it('says when one more analysis frees up, in a tooltip on the count', async () => {
        const quota: Quota = { used: 1, limit: 3, nextFreeAt: NEXT_FREE_AT }
        const { user } = renderHeader(memberAuth(), quota)

        await user.hover(screen.getByText(formatQuotaLeft(quota)))

        expect(await screen.findByRole('tooltip')).toHaveTextContent(describeNextFree(quota) ?? '')
    })

    it('shows no tooltip while no analysis counts', async () => {
        const quota: Quota = { used: 0, limit: 3, nextFreeAt: null }
        const { user } = renderHeader(memberAuth(), quota)

        await user.hover(screen.getByText(formatQuotaLeft(quota)))

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
})
