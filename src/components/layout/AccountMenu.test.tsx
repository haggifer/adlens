import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { AccountMenu } from './AccountMenu'

const signOut = jest.fn(async () => undefined)
let isAnonymous = true

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => ({
        isSignedIn: true,
        isAnonymous,
        user: { id: 'u1', name: isAnonymous ? 'Anonymous' : 'Ann', email: isAnonymous ? null : 'ann@example.com' },
        signOut,
    }),
}))

const renderMenu = () =>
    render(
        <App>
            <AccountMenu />
        </App>,
    )

describe('AccountMenu', () => {
    beforeEach(() => {
        signOut.mockClear()
        isAnonymous = true
    })

    it('lets an anonymous visitor forget this browser once they confirm', async () => {
        renderMenu()

        await userEvent.click(screen.getByRole('button', { name: 'Forget this browser' }))

        expect(
            await screen.findByText('Analyses you ran here without an account will no longer be reachable.'),
        ).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Forget' }))

        await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    })

    it('keeps the anonymous session when the visitor cancels', async () => {
        renderMenu()

        await userEvent.click(screen.getByRole('button', { name: 'Forget this browser' }))
        await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

        expect(signOut).not.toHaveBeenCalled()
    })

    it("doesn't offer a member to forget the browser", () => {
        isAnonymous = false
        renderMenu()

        expect(screen.queryByRole('button', { name: 'Forget this browser' })).not.toBeInTheDocument()
    })
})
