import { describeError } from '@/auth/errors'
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

const CANCELLED_COPY = describeError({ code: 'access_denied' })

// What SocialButtons leaves behind when the sign-in takes this tab to the provider.
const leaveForSignIn = () => sessionStorage.setItem('adlens.redirect-sign-in', '1')

describe('useSignInErrorNotice', () => {
    beforeEach(() => {
        mockReplace.mockClear()
        sessionStorage.clear()
    })

    it('explains a sign-in the provider sent back with an error, then removes it from the address', async () => {
        leaveForSignIn()
        renderAt('error=access_denied&tab=all')

        expect(await screen.findByText(CANCELLED_COPY)).toBeInTheDocument()
        expect(mockReplace).toHaveBeenCalledWith('/history?tab=all', { scroll: false })
    })

    it('falls back to a generic line for an unknown code, and never shows the provider’s own description', async () => {
        leaveForSignIn()
        renderAt('error=state_mismatch&error_description=OAuth+state+cookie+missing')

        expect(await screen.findByText(describeError({ code: 'state_mismatch' }))).toBeInTheDocument()
        expect(screen.queryByText(/state cookie/)).not.toBeInTheDocument()
        expect(mockReplace).toHaveBeenCalledWith('/history', { scroll: false })
    })

    it('leaves the social sign-in popup’s landing page to report its own error', () => {
        leaveForSignIn()
        renderAt('error=access_denied', '/auth/done')

        expect(screen.queryByText(CANCELLED_COPY)).not.toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('ignores an error in a link this tab didn’t leave for a sign-in from', () => {
        renderAt('error=access_denied')

        expect(screen.queryByText(CANCELLED_COPY)).not.toBeInTheDocument()
        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('does nothing back from a sign-in without an error, and forgets the sign-in so a later link with one shows nothing', () => {
        leaveForSignIn()
        renderAt('tab=all')

        expect(mockReplace).not.toHaveBeenCalled()
        expect(sessionStorage.getItem('adlens.redirect-sign-in')).toBeNull()
    })
})
