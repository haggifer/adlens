import type { AuthContextValue } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { anonymousAuth, initializingAuth, MEMBER_EMAIL, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor } from '@testing-library/react'
import { AccountMenu } from './AccountMenu'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockPush = jest.fn()
const mockIsHoverCapable = jest.fn(() => false)

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/hooks/useHoverCapable', () => ({ useHoverCapable: () => mockIsHoverCapable() }))

const renderMenu = (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<AccountMenu />)
}

// Each test opens antd's dropdown or a confirmation: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('AccountMenu', () => {
    beforeEach(() => {
        mockPush.mockClear()
        mockIsHoverCapable.mockReturnValue(false)
        useAuthModalStore.setState({ view: null })
        useContactModalStore.setState({ isOpen: false })
    })

    afterEach(() => jest.restoreAllMocks())

    it('offers a signed-out visitor Sign In', async () => {
        const { user } = renderMenu(signedOutAuth())

        await user.click(screen.getByRole('button', { name: 'Sign In' }))

        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    describe('while the session loads', () => {
        const expectInert = (button: HTMLElement) => {
            expect(button).toHaveAttribute('aria-disabled', 'true')
            expect(button).not.toHaveAttribute('disabled')
        }

        it('draws Sign In at once when nothing is remembered, and wires the same button once the session is ready', async () => {
            const { rerender, user } = renderMenu(initializingAuth())
            const signIn = screen.getByRole('button', { name: 'Sign In' })

            expectInert(signIn)
            expect(signIn).toHaveClass('ant-btn-primary')

            await user.click(signIn)

            expect(useAuthModalStore.getState().view).toBeNull()

            mockUseAuth.mockReturnValue(signedOutAuth())
            rerender(<AccountMenu />)

            expect(screen.getByRole('button', { name: 'Sign In' })).toBe(signIn)
            expect(signIn).not.toHaveAttribute('aria-disabled')

            await user.click(signIn)

            expect(useAuthModalStore.getState().view).toBe('signin')
        })

        it.each([AccountKind.Member, AccountKind.Admin])(
            'shows the avatar of a remembered %s, but no menu opens from it',
            async (kind) => {
                mockIsHoverCapable.mockReturnValue(true)
                const { user } = renderMenu(initializingAuth(kind))
                const avatar = screen.getByRole('button', { name: 'Account menu' })

                expectInert(avatar)
                expect(avatar).not.toHaveAttribute('aria-haspopup')

                await user.hover(avatar)
                await user.click(avatar)
                avatar.focus()
                await user.keyboard('{Enter}')

                expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
                expect(screen.queryByText(MEMBER_EMAIL)).not.toBeInTheDocument()
            },
        )

        it('shows a remembered anonymous visitor’s Sign In as it will be, but ignores it', async () => {
            const { user } = renderMenu(initializingAuth(AccountKind.Anonymous))
            const signIn = screen.getByRole('button', { name: 'Sign In' })

            expectInert(signIn)

            await user.click(signIn)

            expect(useAuthModalStore.getState().view).toBeNull()
        })

        it('shows a remembered unconfirmed account’s buttons as they will be, but ignores them', async () => {
            const auth = initializingAuth(AccountKind.Unconfirmed)
            const { user } = renderMenu(auth)
            const confirm = screen.getByRole('button', { name: 'Confirm email' })
            const signOut = screen.getByRole('button', { name: 'Sign Out' })

            expectInert(confirm)
            expectInert(signOut)

            await user.click(confirm)
            await user.click(signOut)

            expect(useAuthModalStore.getState().view).toBeNull()
            expect(auth.signOut).not.toHaveBeenCalled()
        })

        it('wires the same avatar once the session loads as the remembered member', async () => {
            const { rerender, user } = renderMenu(initializingAuth(AccountKind.Member))
            const avatar = screen.getByRole('button', { name: 'Account menu' })

            mockUseAuth.mockReturnValue(memberAuth())
            rerender(<AccountMenu />)

            expect(screen.getByRole('button', { name: 'Account menu' })).toBe(avatar)
            expect(avatar).not.toHaveAttribute('aria-disabled')

            await user.click(avatar)

            expect(await screen.findByText(MEMBER_EMAIL)).toBeInTheDocument()
        })

        it('switches to the real session once it loads, even when it differs from the remembered one', async () => {
            const { rerender, user } = renderMenu(initializingAuth(AccountKind.Anonymous))

            mockUseAuth.mockReturnValue(memberAuth())
            rerender(<AccountMenu />)

            expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()

            const avatar = screen.getByRole('button', { name: 'Account menu' })

            expect(avatar).not.toHaveAttribute('aria-disabled')
            await user.click(avatar)
            expect(await screen.findByText(MEMBER_EMAIL)).toBeInTheDocument()
        })

        it('offers Sign In once the session loads as none', () => {
            const { rerender } = renderMenu(initializingAuth(AccountKind.Member))

            mockUseAuth.mockReturnValue(signedOutAuth())
            rerender(<AccountMenu />)

            expect(screen.getByRole('button', { name: 'Sign In' })).not.toHaveAttribute('aria-disabled')
            expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
        })
    })

    describe('for an anonymous visitor', () => {
        it('offers Sign In, which also moves the history, and no separate sign-up button', async () => {
            const { user } = renderMenu(anonymousAuth())

            expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            expect(useAuthModalStore.getState().view).toBe('signin')
        })
    })

    describe('for an account whose email isn’t confirmed', () => {
        it('offers Confirm email, which opens the confirmation dialog, and no account menu', async () => {
            const { user } = renderMenu(unconfirmedAuth())

            expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Confirm email' }))

            expect(useAuthModalStore.getState().view).toBe('confirm')
        })

        it('signs out and goes home', async () => {
            const auth = unconfirmedAuth()
            const { user } = renderMenu(auth)

            await user.click(screen.getByRole('button', { name: 'Sign Out' }))

            expect(auth.signOut).toHaveBeenCalledTimes(1)
            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
        })
    })

    describe('for a member', () => {
        const openMenu = async (auth: AuthContextValue = memberAuth()) => {
            const { user } = renderMenu(auth)

            await user.click(screen.getByRole('button', { name: 'Account menu' }))

            return user
        }

        it('shows the email and no Sign In', async () => {
            await openMenu()

            expect(await screen.findByText(MEMBER_EMAIL)).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        })

        describe('on a device that can hover', () => {
            beforeEach(() => mockIsHoverCapable.mockReturnValue(true))

            const focusTrigger = async () => {
                const { user } = renderMenu(memberAuth())
                const trigger = screen.getByRole('button', { name: 'Account menu' })

                await user.tab()
                expect(trigger).toHaveFocus()
                expect(trigger).toHaveAttribute('aria-expanded', 'false')

                return { user, trigger }
            }

            it.each([
                ['Enter', '{Enter}'],
                ['Space', ' '],
                ['the down arrow', '{ArrowDown}'],
            ])('opens from the keyboard with %s', async (_, key) => {
                const { user, trigger } = await focusTrigger()

                await user.keyboard(key)

                expect(await screen.findByRole('menuitem', { name: /Account/ })).toBeInTheDocument()
                expect(trigger).toHaveAttribute('aria-expanded', 'true')
            })

            it('closes on Escape and returns focus to the trigger', async () => {
                const { user, trigger } = await focusTrigger()

                await user.keyboard('{Enter}')
                await screen.findByRole('menuitem', { name: /Account/ })
                await user.keyboard('{Escape}')

                await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
                expect(trigger).toHaveFocus()
            })

            it('stays open when the hovered trigger is clicked', async () => {
                const { user } = renderMenu(memberAuth())
                const trigger = screen.getByRole('button', { name: 'Account menu' })

                await user.hover(trigger)
                await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
                await user.click(trigger)

                expect(trigger).toHaveAttribute('aria-expanded', 'true')
            })
        })

        it('opens the account page', async () => {
            const user = await openMenu()

            await user.click(await screen.findByRole('menuitem', { name: /Account/ }))

            expect(mockPush).toHaveBeenCalledWith('/account')
        })

        it('opens the contact form', async () => {
            const user = await openMenu()

            await user.click(await screen.findByRole('menuitem', { name: /Contact us/ }))

            expect(useContactModalStore.getState().isOpen).toBe(true)
        })

        it('signs out and goes home', async () => {
            const auth = memberAuth()
            const user = await openMenu(auth)

            await user.click(await screen.findByRole('menuitem', { name: /Sign Out/ }))

            expect(auth.signOut).toHaveBeenCalledTimes(1)
            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
        })

        it('shows the error and stays signed in when signing out fails', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            const auth = memberAuth()

            jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500 })
            const user = await openMenu(auth)

            await user.click(await screen.findByRole('menuitem', { name: /Sign Out/ }))

            expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
            expect(mockPush).not.toHaveBeenCalled()
            expect(consoleError).toHaveBeenCalledTimes(1)
        })
    })
})
