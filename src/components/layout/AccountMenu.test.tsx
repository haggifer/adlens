import { screen, waitFor } from '@testing-library/react'
import type { AuthContextValue } from '@/auth/AuthContext'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useContactModalStore } from '@/contexts/stores/contactModalStore'
import { anonymousAuth, MEMBER_EMAIL, memberAuth, signedOutAuth, unconfirmedAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { AccountMenu } from './AccountMenu'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockPush = jest.fn()
const mockIsHoverCapable = jest.fn(() => false)

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/hooks/useHoverCapable', () => ({ useHoverCapable: () => mockIsHoverCapable() }))

const FORGET_WARNING = 'Analyses you ran here without an account will no longer be reachable.'

const renderMenu = (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<AccountMenu />)
}

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

    describe('for an anonymous visitor', () => {
        it('offers Sign In, which also moves the history, and no separate sign-up button', async () => {
            const { user } = renderMenu(anonymousAuth())

            expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Sign In' }))

            expect(useAuthModalStore.getState().view).toBe('signin')
        })

        it('forgets this browser and goes home once the visitor confirms', async () => {
            const auth = anonymousAuth()
            const { user } = renderMenu(auth)

            await user.click(screen.getByRole('button', { name: 'Forget this browser' }))

            expect(await screen.findByText(FORGET_WARNING)).toBeInTheDocument()
            expect(auth.signOut).not.toHaveBeenCalled()

            await user.click(screen.getByRole('button', { name: 'Forget' }))

            expect(auth.signOut).toHaveBeenCalledTimes(1)
            await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
        })

        it('keeps the anonymous session when the visitor cancels', async () => {
            const auth = anonymousAuth()
            const { user } = renderMenu(auth)

            await user.click(screen.getByRole('button', { name: 'Forget this browser' }))
            await user.click(await screen.findByRole('button', { name: 'Cancel' }))

            expect(auth.signOut).not.toHaveBeenCalled()
            expect(mockPush).not.toHaveBeenCalled()
        })

        it('keeps the confirmation open and says so when forgetting fails, and a second try works', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
            const auth = anonymousAuth()

            jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500 })
            const { user } = renderMenu(auth)

            await user.click(screen.getByRole('button', { name: 'Forget this browser' }))
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
        })
    })

    describe('for an account whose email isn’t confirmed', () => {
        it('offers Confirm email, which opens the confirmation dialog, and no account menu', async () => {
            const { user } = renderMenu(unconfirmedAuth())

            expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Forget this browser' })).not.toBeInTheDocument()

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

        it('shows the email and offers no way to forget the browser', async () => {
            await openMenu()

            expect(await screen.findByText(MEMBER_EMAIL)).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Forget this browser' })).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
        })

        it('opens from the keyboard on a device that can hover', async () => {
            mockIsHoverCapable.mockReturnValue(true)
            const { user } = renderMenu(memberAuth())

            await user.tab()
            expect(screen.getByRole('button', { name: 'Account menu' })).toHaveFocus()
            await user.keyboard('{Enter}')

            expect(await screen.findByRole('menuitem', { name: /Account/ })).toBeInTheDocument()
        })

        it('opens the account page', async () => {
            const user = await openMenu()

            await user.click(await screen.findByRole('menuitem', { name: /Account/ }))

            expect(mockPush).toHaveBeenCalledWith('/account')
        })

        it('opens the contact form', async () => {
            const user = await openMenu()

            await user.click(await screen.findByRole('menuitem', { name: /Contact support/ }))

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
