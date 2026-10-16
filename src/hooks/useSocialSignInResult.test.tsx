import { describeError } from '@/auth/errors'
import { refreshSession } from '@/auth/session'
import { postSocialSignInOutcome } from '@/auth/social-sign-in'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor } from '@testing-library/react'
import { useSocialSignInResult } from './useSocialSignInResult'

jest.mock('@/auth/session', () => ({ refreshSession: jest.fn() }))

const CANCELLED_COPY = describeError({ code: 'access_denied' })

const onSettled = jest.fn()

const Probe = ({ isPending }: { isPending: boolean }) => {
    useSocialSignInResult({ isPending, onSettled })

    return null
}

describe('useSocialSignInResult', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuthModalStore.setState({ view: 'signin', isOtherAddressLink: false })
    })

    it('fetches the session and closes the dialog when the popup signed the user in', async () => {
        renderWithProviders(<Probe isPending />)

        postSocialSignInOutcome({ errorCode: null })

        await waitFor(() => expect(onSettled).toHaveBeenCalled())
        expect(refreshSession).toHaveBeenCalled()
        expect(useAuthModalStore.getState().view).toBeNull()
    })

    it('explains a sign-in the provider refused and keeps the dialog open', async () => {
        renderWithProviders(<Probe isPending />)

        postSocialSignInOutcome({ errorCode: 'access_denied' })

        expect(await screen.findByText(CANCELLED_COPY)).toBeInTheDocument()
        expect(onSettled).toHaveBeenCalled()
        expect(refreshSession).not.toHaveBeenCalled()
        expect(useAuthModalStore.getState().view).toBe('signin')
    })

    it('ignores the popup when no sign-in is pending', async () => {
        renderWithProviders(<Probe isPending={false} />)

        postSocialSignInOutcome({ errorCode: 'access_denied' })
        await new Promise((resolve) => setTimeout(resolve, 20))

        expect(onSettled).not.toHaveBeenCalled()
        expect(screen.queryByText(CANCELLED_COPY)).not.toBeInTheDocument()
    })
})
