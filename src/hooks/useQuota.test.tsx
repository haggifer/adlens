import { getQuota, getVisitorQuota } from '@/api/me'
import type { AuthContextValue } from '@/auth/AuthContext'
import { initializingAuth, memberAuth, signedOutAuth } from '@/test/auth'
import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { useQuota } from './useQuota'

const mockUseAuth = jest.fn<AuthContextValue, []>()

jest.mock('@/auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('@/api/me', () => ({ getQuota: jest.fn(), getVisitorQuota: jest.fn() }))

const Probe = () => {
    const { quota } = useQuota()

    return <span>{quota ? `${quota.used}/${quota.limit}` : 'none'}</span>
}

const renderProbe = (auth: AuthContextValue) => {
    mockUseAuth.mockReturnValue(auth)
    renderWithProviders(<Probe />)
}

describe('useQuota', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(getQuota).mockResolvedValue({ used: 2, limit: 5, nextFreeAt: null })
        jest.mocked(getVisitorQuota).mockResolvedValue({ used: 0, limit: 1, nextFreeAt: null })
    })

    it('reads a signed-in user’s own quota', async () => {
        renderProbe(memberAuth())

        expect(await screen.findByText('2/5')).toBeInTheDocument()
        expect(getVisitorQuota).not.toHaveBeenCalled()
    })

    it('gives a visitor without a session what their first analysis allows', async () => {
        renderProbe(signedOutAuth())

        expect(await screen.findByText('0/1')).toBeInTheDocument()
        expect(getQuota).not.toHaveBeenCalled()
    })

    it('asks for nothing while the session loads', () => {
        renderProbe(initializingAuth())

        expect(screen.getByText('none')).toBeInTheDocument()
        expect(getQuota).not.toHaveBeenCalled()
        expect(getVisitorQuota).not.toHaveBeenCalled()
    })
})
