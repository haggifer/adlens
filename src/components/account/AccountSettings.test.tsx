import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { App } from 'antd'
import { AccountSettings } from './AccountSettings'

let providers: string[] | undefined

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'u1', name: 'Ann', email: 'ann@example.com' }, signOut: jest.fn() }),
}))
jest.mock('@/auth/authClient', () => ({}))
jest.mock('@/hooks/useLinkedAccounts', () => ({ useLinkedAccounts: () => ({ providers, isLoading: !providers }) }))

const renderSettings = () =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <App>
                <AccountSettings />
            </App>
        </QueryClientProvider>,
    )

describe('AccountSettings', () => {
    it('offers to change the password and asks for it to delete, when the user has one', () => {
        providers = ['credential', 'google']
        renderSettings()

        expect(screen.getByText('Email and password, Google')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('offers to set a password and deletes without one, when the user signs in with a provider only', () => {
        providers = ['github']
        renderSettings()

        expect(screen.getByText('GitHub')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Change password' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /email me a link/i })).toBeInTheDocument()
        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    })

    it('waits for the sign-in methods before showing password and deletion settings', () => {
        providers = undefined
        renderSettings()

        expect(screen.queryByRole('heading', { name: 'Change password' })).not.toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Delete account' })).not.toBeInTheDocument()
    })
})
