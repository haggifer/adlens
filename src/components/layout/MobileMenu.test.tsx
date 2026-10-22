import type { AuthContextValue } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import {
    adminAuth,
    anonymousAuth,
    initializingAuth,
    MEMBER_EMAIL,
    memberAuth,
    signedOutAuth,
    unconfirmedAuth,
} from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { Quota } from 'adlens-shared'
import { MobileMenu } from './MobileMenu'
import { describeNextFree, formatQuotaLeft } from './quota-label'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockPush = jest.fn()
let mockQuota: Quota | undefined
let mockPathname = '/'

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname, useRouter: () => ({ push: mockPush }) }))
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
        mockPathname = '/'
        useAuthModalStore.setState({ view: null })
        useContactModalStore.setState({ isOpen: false })
    })

    it('closes when the page changes without it, as on Back', async () => {
        const { rerender } = await openMenu(memberAuth())

        mockPathname = '/history'
        rerender(<MobileMenu />)

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false'),
        )
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

        it('shows a remembered unconfirmed account’s Sign Out, ignored, and Confirm email only with its address', async () => {
            const auth = initializingAuth(AccountKind.Unconfirmed)
            const { user, menu } = await openMenu(auth)
            const signOut = menu.getByRole('button', { name: /Sign Out/ })

            expectInert(signOut)

            await user.click(signOut)

            expect(auth.signOut).not.toHaveBeenCalled()
            expect(menu.queryByRole('button', { name: 'Confirm email' })).not.toBeInTheDocument()
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

            expect(menu.queryByText(formatQuotaLeft(QUOTA))).not.toBeInTheDocument()
            expect(menu.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
            expect(menu.getByRole('link', { name: /History/ })).toBeInTheDocument()
            expect(menu.getByRole('link', { name: /Presets/ })).toHaveAttribute('href', '/presets')
            expect(menu.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
            expect(menu.queryByRole('button', { name: /Sign Out/ })).not.toBeInTheDocument()
            expect(menu.queryByText(/@/)).not.toBeInTheDocument()
        })

        it('opens sign-in', async () => {
            const { user, menu } = await openMenu(anonymousAuth())

            await user.click(menu.getByRole('button', { name: 'Sign In' }))

            expect(useAuthModalStore.getState().view).toBe('signin')
        })
    })

    describe('for an account whose email isn’t confirmed', () => {
        it('puts Confirm email right under the address it confirms, above the analyses left', async () => {
            const { menu } = await openMenu(unconfirmedAuth())
            const email = menu.getByText(MEMBER_EMAIL)
            const confirm = menu.getByRole('button', { name: 'Confirm email' })
            const quota = menu.getByText(formatQuotaLeft(QUOTA))

            expect(email.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
            expect(confirm.compareDocumentPosition(quota) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        })

        it('shows Sign Out and History, but no account page or Sign In', async () => {
            const { menu } = await openMenu(unconfirmedAuth())

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
        it('says when one more analysis frees up after the count', async () => {
            const quota: Quota = { used: 1, limit: 3, nextFreeAt: '2026-10-16T09:30:00.000Z' }

            mockQuota = quota
            const { menu } = await openMenu(memberAuth())

            expect(menu.getByText(`${formatQuotaLeft(quota)} · ${describeNextFree(quota)}`)).toBeInTheDocument()
        })

        it('shows the email but not the name a Google or GitHub sign-in brought, the account page, and Sign Out', async () => {
            const { menu } = await openMenu(memberAuth())

            expect(menu.getByText(MEMBER_EMAIL)).toBeInTheDocument()
            expect(menu.queryByText('Ann')).not.toBeInTheDocument()
            expect(menu.getByRole('link', { name: /Account/ })).toBeInTheDocument()
            expect(menu.getByRole('button', { name: /Sign Out/ })).toBeInTheDocument()
            expect(menu.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        })

        it('offers no admin page', async () => {
            const { menu } = await openMenu(memberAuth())

            expect(menu.queryByRole('link', { name: /Admin/ })).not.toBeInTheDocument()
        })

        it('signs out and goes home', async () => {
            const auth = memberAuth()
            const { user, menu } = await openMenu(auth)

            await user.click(menu.getByRole('button', { name: /Sign Out/ }))

            expect(auth.signOut).toHaveBeenCalledTimes(1)
            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
        })

        it('opens the contact form', async () => {
            const { user, menu } = await openMenu(memberAuth())

            await user.click(menu.getByRole('button', { name: /Contact us/ }))

            expect(useContactModalStore.getState().isOpen).toBe(true)
        })
    })

    describe('for an admin', () => {
        it('links the admin page right after the account page', async () => {
            const { menu } = await openMenu(adminAuth())
            const links = menu.getAllByRole('link')
            const admin = menu.getByRole('link', { name: /Admin/ })

            expect(admin).toHaveAttribute('href', '/admin')
            expect(links.indexOf(admin)).toBe(links.indexOf(menu.getByRole('link', { name: /Account/ })) + 1)
        })
    })

    it('shows a signed-out visitor only the public pages, Presets among them', async () => {
        const { menu } = await openMenu(signedOutAuth())

        expect(menu.getByRole('link', { name: /Analyze/ })).toBeInTheDocument()
        expect(menu.getByRole('link', { name: /Examples/ })).toHaveAttribute('href', '/demo')
        expect(menu.queryByRole('link', { name: /History/ })).not.toBeInTheDocument()
        expect(menu.getByRole('link', { name: /Presets/ })).toHaveAttribute('href', '/presets')
        expect(menu.queryByRole('link', { name: /Account/ })).not.toBeInTheDocument()
        expect(menu.queryByRole('button', { name: /Sign Out/ })).not.toBeInTheDocument()
    })

    describe('swiping', () => {
        const originalMatchMedia = window.matchMedia
        let isNarrow = true

        // The swipe listens on the whole page, so a touch anywhere reaches it.
        const swipe = (target: Element, from: [number, number], to: [number, number]) => {
            fireEvent.touchStart(target, { touches: [{ clientX: from[0], clientY: from[1] }] })
            fireEvent.touchMove(target, { touches: [{ clientX: to[0], clientY: to[1] }] })
            fireEvent.touchEnd(target, { touches: [] })
        }

        const expectOpen = (isOpen: boolean) =>
            waitFor(() =>
                expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
                    'aria-expanded',
                    String(isOpen),
                ),
            )

        const renderClosed = () => {
            mockUseAuth.mockReturnValue(memberAuth())
            renderWithProviders(<MobileMenu />)
        }

        beforeEach(() => {
            isNarrow = true
            window.matchMedia = (query) => ({
                ...originalMatchMedia(query),
                matches: isNarrow && query === '(max-width: 991.98px)',
            })
        })

        afterEach(() => {
            window.matchMedia = originalMatchMedia
        })

        it('opens the menu on a swipe left anywhere on the page', async () => {
            renderClosed()

            swipe(document.body, [300, 200], [100, 210])

            await expectOpen(true)
        })

        it('leaves a swipe left in a text field to the field', async () => {
            renderClosed()

            const input = document.body.appendChild(document.createElement('input'))

            swipe(input, [300, 200], [100, 210])

            await expectOpen(false)
            input.remove()
        })

        it('leaves the page alone where the header shows its links instead of the menu', async () => {
            isNarrow = false
            renderClosed()

            swipe(document.body, [300, 200], [100, 210])

            await expectOpen(false)
        })

        it('closes the menu on a swipe right over the menu', async () => {
            await openMenu(memberAuth())

            swipe(screen.getByRole('dialog', { name: 'Menu' }), [40, 200], [240, 210])

            await expectOpen(false)
        })

        it('closes the menu on a swipe right beside it', async () => {
            await openMenu(memberAuth())

            swipe(document.body, [10, 200], [210, 210])

            await expectOpen(false)
        })

        it('keeps the menu open on a mostly vertical swipe, which scrolls it', async () => {
            await openMenu(memberAuth())

            swipe(screen.getByRole('dialog', { name: 'Menu' }), [40, 400], [70, 100])

            await expectOpen(true)
        })
    })
})
