import { render, screen } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import { App } from 'antd'
import { Header } from './Header'

let quota: Quota | undefined
let isSignedIn = true
let isAnonymous = false

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => ({
        isSignedIn,
        isAnonymous,
        user: isSignedIn
            ? { id: 'u1', name: isAnonymous ? 'Anonymous' : 'Ann', email: isAnonymous ? null : 'ann@example.com' }
            : null,
    }),
}))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota }) }))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const renderHeader = () =>
    render(
        <App>
            <Header />
        </App>,
    )

describe('Header', () => {
    it('shows how many analyses are left next to the account menu', () => {
        isSignedIn = true
        isAnonymous = false
        quota = { used: 1, limit: 3, nextFreeAt: null }
        renderHeader()

        expect(screen.getByText('2/3 analyses left')).toBeInTheDocument()
    })

    it('shows no count to signed-out visitors', () => {
        isSignedIn = false
        isAnonymous = false
        quota = undefined
        renderHeader()

        expect(screen.queryByText(/analyses left/)).not.toBeInTheDocument()
    })

    it('offers an anonymous visitor to sign up instead of an account menu', () => {
        isSignedIn = true
        isAnonymous = true
        quota = { used: 1, limit: 3, nextFreeAt: null }
        renderHeader()

        expect(screen.getByRole('button', { name: 'Sign up to keep your history' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
        expect(screen.getByText('2/3 analyses left')).toBeInTheDocument()
    })
})
