import { screen, waitFor, within } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import type { AuthContextValue } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { anonymousAuth, MEMBER_EMAIL, memberAuth, signedOutAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { MobileMenu } from './MobileMenu'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockPush = jest.fn()
let mockQuota: Quota | undefined

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: mockQuota }) }))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const QUOTA: Quota = { used: 1, limit: 3, nextFreeAt: null }

const FORGET_WARNING = 'Analyses you ran here without an account will no longer be reachable.'

const openMenu = async (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)

    const { user } = renderWithProviders(<MobileMenu />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const menu = await screen.findByRole('dialog', { name: 'Menu' })

    return { user, menu: within(menu) }
}

describe('MobileMenu', () => {
    beforeEach(() => {
        mockPush.mockClear()
        mockQuota = QUOTA
        useAuthModalStore.setState({ view: null })
        useContactModalStore.setState({ isOpen: false })
    })

    describe('for an anonymous visitor', () => {
        it('shows the count, Sign In and Forget this browser, but no sign-up button, email or account items', async () => {
            const { menu } = await openMenu(anonymousAuth())

            expect(menu.getByText('2/3 analyses left')).toBeInTheDocument()
            expect(menu.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
            expect(menu.getByRole('button', { name: /Forget this browser/ })).toBeInTheDocument()
            expect(menu.getByRole('link', { name: /History/ })).toBeInTheDocument()
            expect(menu.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /Sign Out/ })).not.toBeInTheDocument()
            expect(menu.queryByText(/@/)).not.toBeInTheDocument()
        })

        it('opens sign-in, which also moves the history', async () => {
            const { user, menu } = await openMenu(anonymousAuth())

            await user.click(menu.getByRole('button', { name: 'Sign In' }))

            expect(useAuthModalStore.getState().view).toBe('signin')
        })

        it('forgets this browser once the visitor confirms', async () => {
            const auth = anonymousAuth()
            const { user, menu } = await openMenu(auth)

            await user.click(menu.getByRole('button', { name: /Forget this browser/ }))

            expect(await screen.findByText(FORGET_WARNING)).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Forget' }))

            expect(auth.signOut).toHaveBeenCalledTimes(1)
            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
        })

        it('keeps the anonymous session when the visitor cancels', async () => {
            const auth = anonymousAuth()
            const { user, menu } = await openMenu(auth)

            await user.click(menu.getByRole('button', { name: /Forget this browser/ }))
            await user.click(await screen.findByRole('button', { name: 'Cancel' }))

            expect(auth.signOut).not.toHaveBeenCalled()
        })

        it('keeps the confirmation open and says so when forgetting fails, and a second try works', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            const auth = anonymousAuth()

            jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500 })
            const { user, menu } = await openMenu(auth)

            await user.click(menu.getByRole('button', { name: /Forget this browser/ }))
            await user.click(await screen.findByRole('button', { name: 'Forget' }))

            expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
            await waitFor(() =>
                expect(screen.getByRole('button', { name: 'Forget' })).not.toHaveClass('ant-btn-loading'),
            )
            expect(screen.getByText(FORGET_WARNING)).toBeInTheDocument()
            expect(mockPush).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalledTimes(1)

            await user.click(screen.getByRole('button', { name: 'Forget' }))

            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
            expect(auth.signOut).toHaveBeenCalledTimes(2)
            await waitFor(() => expect(screen.queryByText(FORGET_WARNING)).not.toBeInTheDocument())

            consoleError.mockRestore()
        })
    })

    describe('for a member', () => {
        it('shows the name, email and account page, and Sign Out instead of forgetting the browser', async () => {
            const { menu } = await openMenu(memberAuth())

            expect(menu.getByText('Ann')).toBeInTheDocument()
            expect(menu.getByText(MEMBER_EMAIL)).toBeInTheDocument()
            expect(menu.getByRole('link', { name: /Account/ })).toBeInTheDocument()
            expect(menu.getByRole('button', { name: /Sign Out/ })).toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /Forget this browser/ })).not.toBeInTheDocument()
            expect(menu.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        })

        it('signs out and goes home', async () => {
            const auth = memberAuth()
            const { user, menu } = await openMenu(auth)

            await user.click(menu.getByRole('button', { name: /Sign Out/ }))

            expect(auth.signOut).toHaveBeenCalledTimes(1)
            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
        })

        it('shows the error and stays signed in when signing out fails', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            const auth = memberAuth()

            jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500 })
            const { user, menu } = await openMenu(auth)

            await user.click(menu.getByRole('button', { name: /Sign Out/ }))

            expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
            expect(mockPush).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalledTimes(1)

            consoleError.mockRestore()
        })

        it('opens the contact form', async () => {
            const { user, menu } = await openMenu(memberAuth())

            await user.click(menu.getByRole('button', { name: /Contact support/ }))

            expect(useContactModalStore.getState().isOpen).toBe(true)
        })
    })

    it('shows a signed-out visitor only the public pages', async () => {
        const { menu } = await openMenu(signedOutAuth())

        expect(menu.getByRole('link', { name: /Analyze/ })).toBeInTheDocument()
        expect(menu.queryByRole('link', { name: /History/ })).not.toBeInTheDocument()
        expect(menu.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
        expect(menu.queryByRole('button', { name: /Sign Out|Forget this browser/ })).not.toBeInTheDocument()
    })
})
