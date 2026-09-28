import { render, screen } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import { App } from 'antd'
import { Header } from './Header'

let quota: Quota | undefined
let isSignedIn = true

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => ({ isSignedIn, user: isSignedIn ? { id: 'u1', name: 'Ann', email: 'ann@example.com' } : null }),
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
        quota = { used: 1, limit: 3, nextFreeAt: null }
        renderHeader()

        expect(screen.getByText('2/3 analyses left')).toBeInTheDocument()
    })

    it('shows no count to signed-out visitors', () => {
        isSignedIn = false
        quota = undefined
        renderHeader()

        expect(screen.queryByText(/analyses left/)).not.toBeInTheDocument()
    })
})
