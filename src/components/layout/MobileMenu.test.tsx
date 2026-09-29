import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { MobileMenu } from './MobileMenu'

const signOut = jest.fn(async () => undefined)
let isAnonymous = true

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => ({
        isSignedIn: true,
        isAnonymous,
        user: { id: 'u1', name: isAnonymous ? 'Anonymous' : 'Ann', email: isAnonymous ? null : 'ann@example.com' },
        signOut,
    }),
}))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: undefined }) }))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const openMenu = async () => {
    render(
        <App>
            <MobileMenu />
        </App>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
}

describe('MobileMenu', () => {
    beforeEach(() => {
        signOut.mockClear()
        isAnonymous = true
    })

    it('lets an anonymous visitor forget this browser once they confirm', async () => {
        await openMenu()
        await userEvent.click(await screen.findByRole('button', { name: /Forget this browser/ }))

        expect(
            await screen.findByText('Analyses you ran here without an account will no longer be reachable.'),
        ).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Forget' }))

        await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    })

    it('keeps the anonymous session when the visitor cancels', async () => {
        await openMenu()
        await userEvent.click(await screen.findByRole('button', { name: /Forget this browser/ }))
        await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

        expect(signOut).not.toHaveBeenCalled()
    })

    it('offers a member Sign Out instead of forgetting the browser', async () => {
        isAnonymous = false
        await openMenu()

        expect(await screen.findByRole('button', { name: /Sign Out/ })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Forget this browser/ })).not.toBeInTheDocument()
    })
})
