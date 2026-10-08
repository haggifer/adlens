import type { AuthContextValue } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { anonymousAuth, initializingAuth, MEMBER_EMAIL, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor, within } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import { MobileMenu } from './MobileMenu'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockPush = jest.fn()
let mockQuota: Quota | undefined

jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/hooks/useQuota', () => ({ useQuota: () => ({ quota: mockQuota }) }))
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const QUOTA: Quota = { used: 1, limit: 3, nextFreeAt: null }

const openMenu = async (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)

    const { user, rerender } = renderWithProviders(<MobileMenu />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const menu = await screen.findByRole('dialog', { name: 'Menu' })

    return { user, rerender, menu: within(menu) }
}

// Each test opens antd's drawer, and some a confirmation on top: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('MobileMenu', () => {
    beforeEach(() => {
        mockPush.mockClear()
        mockQuota = QUOTA
        useAuthModalStore.setState({ view: null })
        useContactModalStore.setState({ isOpen: false })
    })

    describe('while the session loads', () => {
        beforeEach(() => {
            mockQuota = undefined
        })

        const expectInert = (button: HTMLElement) => {
            expect(button).toHaveAttribute('aria-disabled', 'true')
            expect(button).not.toHaveAttribute('disabled')
        }

        it('shows a remembered anonymous visitor’s Sign In, but ignores it', async () => {
            const { user, menu } = await openMenu(initializingAuth(AccountKind.Anonymous))
            const signIn = menu.getByRole('button', { name: 'Sign In' })

            expectInert(signIn)

            await user.click(signIn)

            expect(useAuthModalStore.getState().view).toBeNull()
        })

        it('shows a remembered unconfirmed account’s Confirm email and Sign Out, but ignores them', async () => {
            const auth = initializingAuth(AccountKind.Unconfirmed)
            const { user, menu } = await openMenu(auth)
            const confirm = menu.getByRole('button', { name: 'Confirm email' })
            const signOut = menu.getByRole('button', { name: /Sign Out/ })

            expectInert(confirm)
            expectInert(signOut)

            await user.click(confirm)
            await user.click(signOut)

            expect(useAuthModalStore.getState().view).toBeNull()
            expect(auth.signOut).not.toHaveBeenCalled()
        })

        it.each([AccountKind.Member, AccountKind.Admin])(
            'shows a remembered %s Sign Out, ignored, and no email',
            async (kind) => {
                const auth = initializingAuth(kind)
                const { user, menu } = await openMenu(auth)
                const signOut = menu.getByRole('button', { name: /Sign Out/ })

                expectInert(signOut)

                await user.click(signOut)

                expect(auth.signOut).not.toHaveBeenCalled()
                expect(menu.getByRole('link', { name: /Account/ })).toBeInTheDocument()
                expect(menu.queryByText(/@/)).not.toBeInTheDocument()
            },
        )

        it('offers no Sign In when nothing is remembered, since the bar already shows it', async () => {
            const { menu } = await openMenu(initializingAuth())

            expect(menu.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /Sign Out/ })).not.toBeInTheDocument()
        })

        it('wires the same Sign Out once the session loads', async () => {
            const auth = memberAuth()
            const { user, rerender, menu } = await openMenu(initializingAuth(AccountKind.Member))
            const signOut = menu.getByRole('button', { name: /Sign Out/ })

            mockUseAuth.mockReturnValue(auth)
            rerender(<MobileMenu />)

            expect(menu.getByRole('button', { name: /Sign Out/ })).toBe(signOut)
            expect(signOut).not.toHaveAttribute('aria-disabled')

            await user.click(signOut)

            expect(auth.signOut).toHaveBeenCalledTimes(1)
        })
    })

    describe('for an anonymous visitor', () => {
        it('shows Sign In, but no count, sign-up button, email or account items', async () => {
            const { menu } = await openMenu(anonymousAuth())

            expect(menu.queryByText(/analyses left/)).not.toBeInTheDocument()
            expect(menu.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
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
    })

    describe('for an account whose email isn’t confirmed', () => {
        it('shows the name, email, count, Confirm email and Sign Out, but no account page', async () => {
            const { menu } = await openMenu(unconfirmedAuth())

            expect(menu.getByText('Ann')).toBeInTheDocument()
            expect(menu.getByText(MEMBER_EMAIL)).toBeInTheDocument()
            expect(menu.getByText('2/3 analyses left')).toBeInTheDocument()
            expect(menu.getByRole('button', { name: 'Confirm email' })).toBeInTheDocument()
            expect(menu.getByRole('button', { name: /Sign Out/ })).toBeInTheDocument()
            expect(menu.getByRole('link', { name: /History/ })).toBeInTheDocument()
            expect(menu.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
            expect(menu.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        })

        it('opens the confirmation dialog', async () => {
            const { user, menu } = await openMenu(unconfirmedAuth())

            await user.click(menu.getByRole('button', { name: 'Confirm email' }))

            expect(useAuthModalStore.getState().view).toBe('confirm')
        })
    })

    describe('for a member', () => {
        it('shows the name, email and account page, and Sign Out', async () => {
            const { menu } = await openMenu(memberAuth())

            expect(menu.getByText('Ann')).toBeInTheDocument()
            expect(menu.getByText(MEMBER_EMAIL)).toBeInTheDocument()
            expect(menu.getByRole('link', { name: /Account/ })).toBeInTheDocument()
            expect(menu.getByRole('button', { name: /Sign Out/ })).toBeInTheDocument()
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

            await user.click(menu.getByRole('button', { name: /Contact us/ }))

            expect(useContactModalStore.getState().isOpen).toBe(true)
        })
    })

    it('shows a signed-out visitor only the public pages', async () => {
        const { menu } = await openMenu(signedOutAuth())

        expect(menu.getByRole('link', { name: /Analyze/ })).toBeInTheDocument()
        expect(menu.getByRole('link', { name: /Examples/ })).toHaveAttribute('href', '/demo')
        expect(menu.queryByRole('link', { name: /History/ })).not.toBeInTheDocument()
        expect(menu.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
        expect(menu.queryByRole('button', { name: /Sign Out/ })).not.toBeInTheDocument()
    })
})
