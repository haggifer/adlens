import type { AuthContextValue } from '@/auth/AuthContext'
import { describeError } from '@/auth/errors'
import { memberAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { Button } from 'antd'
import { useSignOut } from './useSignOut'

const mockUseAuth = jest.fn<AuthContextValue, []>()
const mockPush = jest.fn()
let mockPathname = '/history'

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname, useRouter: () => ({ push: mockPush }) }))
jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

const Probe = () => {
    const signOut = useSignOut()

    return (
        <Button type="primary" onClick={() => void signOut()}>
            Sign out
        </Button>
    )
}

const renderProbe = (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)

    return renderWithProviders(<Probe />)
}

describe('useSignOut', () => {
    beforeEach(() => {
        mockPush.mockClear()
        mockPathname = '/history'
    })

    afterEach(() => jest.restoreAllMocks())

    it('signs out and leaves a guarded page for home', async () => {
        const auth = memberAuth()
        const { user } = renderProbe(auth)

        await user.click(screen.getByRole('button', { name: 'Sign out' }))

        expect(auth.signOut).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('signs out and stays on a public page', async () => {
        mockPathname = '/demo'
        const auth = memberAuth()
        const { user } = renderProbe(auth)

        await user.click(screen.getByRole('button', { name: 'Sign out' }))

        expect(auth.signOut).toHaveBeenCalledTimes(1)
        expect(mockPush).not.toHaveBeenCalled()
    })

    it('shows the standard copy and stays put when the API refused the sign-out', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
        const auth = memberAuth()

        jest.mocked(auth.signOut).mockRejectedValueOnce({ status: 500, code: 'SOME_CODE' })
        const { user } = renderProbe(auth)

        await user.click(screen.getByRole('button', { name: 'Sign out' }))

        expect(await screen.findByText(describeError({ status: 500 }))).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledTimes(1)
    })

    it('shows the network-failure copy when the sign-out request never reaches the API', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
        const auth = memberAuth()

        jest.mocked(auth.signOut).mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        const { user } = renderProbe(auth)

        await user.click(screen.getByRole('button', { name: 'Sign out' }))

        expect(await screen.findByText(describeError({ code: 'NETWORK_ERROR' }))).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
    })
})
