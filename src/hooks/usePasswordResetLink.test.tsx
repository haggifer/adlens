import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { usePasswordResetLink } from './usePasswordResetLink'

const mockReplace = jest.fn()
let mockSearch = ''

jest.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ replace: mockReplace }),
    useSearchParams: () => new URLSearchParams(mockSearch),
}))

const Probe = () => {
    usePasswordResetLink()

    return null
}

const renderAt = (search: string) => {
    mockSearch = search
    renderWithProviders(<Probe />)
}

describe('usePasswordResetLink', () => {
    beforeEach(() => {
        mockReplace.mockClear()
        useAuthModalStore.setState({ view: null, resetToken: null })
    })

    it('opens the reset form with the link’s token, then removes the token from the address', () => {
        renderAt('reset-password-token=a-token&platform=meta')

        expect(useAuthModalStore.getState()).toMatchObject({ view: 'reset', resetToken: 'a-token' })
        expect(mockReplace).toHaveBeenCalledWith('/?platform=meta', { scroll: false })
    })

    it('leaves the modal and the address alone without a token', () => {
        renderAt('platform=meta')

        expect(useAuthModalStore.getState().view).toBeNull()
        expect(mockReplace).not.toHaveBeenCalled()
    })
})
