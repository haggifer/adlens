import { renderWithProviders } from '@/test/render'
import { screen } from '@testing-library/react'
import { useSignInErrorNotice } from './useSignInErrorNotice'

const mockReplace = jest.fn()
let mockSearch = ''
let mockPathname = '/history'

jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ replace: mockReplace }),
    useSearchParams: () => new URLSearchParams(mockSearch),
}))

const Probe = () => {
    useSignInErrorNotice()

    return null
}

const renderAt = (search: string, pathname = '/history') => {
    mockSearch = search
    mockPathname = pathname
    renderWithProviders(<Probe />)
}

describe('useSignInErrorNotice', () => {
    beforeEach(() => mockReplace.mockClear())

    it('explains a sign-in the provider sent back with an error, then removes it from the address', async () => {
        renderAt('error=access_denied&tab=all')

        expect(await screen.findByText('Sign-in was cancelled.')).toBeInTheDocument()
        expect(mockReplace).toHaveBeenCalledWith('/history?tab=all', { scroll: false })
    })

    it('falls back to a generic line for an unknown code, and never shows the provider’s own description', async () => {
        renderAt('error=state_mismatch&error_description=OAuth+state+cookie+missing')

        expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
        expect(screen.queryByText(/state cookie/)).not.toBeInTheDocument()
        expect(mockReplace).toHaveBeenCalledWith('/history', { scroll: false })
    })

    it('leaves the social sign-in popup’s landing page to report its own error', () => {
        renderAt('error=access_denied', '/auth/done')

        expect(screen.queryByText('Sign-in was cancelled.')).not.toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('does nothing without an error', () => {
        renderAt('tab=all')

        expect(mockReplace).not.toHaveBeenCalled()
    })
})
