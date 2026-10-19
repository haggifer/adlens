import { LEAVE_PROMPT } from '@/components/utils/leave-guard'
import { useLeaveGuardStore } from '@/contexts/stores/leaveGuardStore'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AppLink } from './AppLink'

interface NavigateEvent {
    preventDefault: () => void
}

const mockNavigate = jest.fn()

// Next's Link calls onNavigate only inside the App Router; this stand-in calls it on every click and navigates unless
// the handler prevented it.
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({
        href,
        children,
        onNavigate,
    }: {
        href: string
        children: ReactNode
        onNavigate?: (event: NavigateEvent) => void
    }) => (
        <a
            href={href}
            onClick={(event) => {
                event.preventDefault()

                let isPrevented = false

                onNavigate?.({ preventDefault: () => (isPrevented = true) })

                if (!isPrevented) {
                    mockNavigate(href)
                }
            }}
        >
            {children}
        </a>
    ),
}))
jest.mock('next/navigation', () => ({ usePathname: () => '/' }))

const clickLink = async (href: string) => {
    render(<AppLink href={href}>Go</AppLink>)
    await userEvent.click(screen.getByText('Go'))
}

describe('AppLink', () => {
    let confirmSpy: jest.SpyInstance

    beforeEach(() => {
        mockNavigate.mockClear()
        confirmSpy = jest.spyOn(window, 'confirm')
    })

    afterEach(() => {
        confirmSpy.mockRestore()
        useLeaveGuardStore.setState({ isGuarded: false })
    })

    it('navigates without asking while nothing is guarded', async () => {
        await clickLink('/history')

        expect(confirmSpy).not.toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith('/history')
    })

    it.each([
        [true, ['/history']],
        [false, []],
    ])('asks before leaving a guarded page and navigates only when confirmed (%s)', async (isConfirmed, navigated) => {
        useLeaveGuardStore.setState({ isGuarded: true })
        confirmSpy.mockReturnValue(isConfirmed)

        await clickLink('/history')

        expect(confirmSpy).toHaveBeenCalledWith(LEAVE_PROMPT)
        expect(mockNavigate.mock.calls.flat()).toEqual(navigated)
    })

    it('never asks for a link to the page already open', async () => {
        useLeaveGuardStore.setState({ isGuarded: true })

        await clickLink('/')

        expect(confirmSpy).not.toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })
})
