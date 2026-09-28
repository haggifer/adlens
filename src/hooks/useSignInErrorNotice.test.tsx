import { render, screen } from '@testing-library/react'
import { App } from 'antd'
import { useSignInErrorNotice } from './useSignInErrorNotice'

const replace = jest.fn()
let search = ''

jest.mock('next/navigation', () => ({
    usePathname: () => '/history',
    useRouter: () => ({ replace }),
    useSearchParams: () => new URLSearchParams(search),
}))

const Probe = () => {
    useSignInErrorNotice()

    return null
}

const renderProbe = () =>
    render(
        <App>
            <Probe />
        </App>,
    )

describe('useSignInErrorNotice', () => {
    beforeEach(() => replace.mockClear())

    it('explains a sign-in the provider sent back with an error, then removes it from the address', async () => {
        search = 'error=access_denied&tab=all'
        renderProbe()

        expect(await screen.findByText('Sign-in was cancelled.')).toBeInTheDocument()
        expect(replace).toHaveBeenCalledWith('/history?tab=all', { scroll: false })
    })

    it('falls back to a generic line for an unknown code', async () => {
        search = 'error=state_mismatch'
        renderProbe()

        expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
        expect(replace).toHaveBeenCalledWith('/history', { scroll: false })
    })

    it('does nothing without an error', () => {
        search = 'tab=all'
        renderProbe()

        expect(replace).not.toHaveBeenCalled()
    })
})
