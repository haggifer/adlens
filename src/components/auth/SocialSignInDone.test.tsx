import { announceSessionChange } from '@/auth/session'
import { subscribeSocialSignInOutcome } from '@/auth/social-sign-in'
import type { SocialSignInOutcome } from '@/auth/types'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor } from '@testing-library/react'
import { SocialSignInDone } from './SocialSignInDone'

jest.mock('@/auth/session', () => ({ announceSessionChange: jest.fn() }))

const listenToPopup = () => {
    const listener = jest.fn<void, [SocialSignInOutcome]>()
    const unsubscribe = subscribeSocialSignInOutcome(listener)

    return { listener, unsubscribe }
}

describe('SocialSignInDone', () => {
    let close: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        close = jest.spyOn(window, 'close').mockImplementation(() => {})
    })

    afterEach(() => close.mockRestore())

    it('tells the opening tab the sign-in succeeded, has other tabs fetch the session, and closes itself', async () => {
        const { listener, unsubscribe } = listenToPopup()

        renderWithProviders(<SocialSignInDone errorCode={null} />)

        await waitFor(() => expect(listener).toHaveBeenCalledWith({ errorCode: null }))
        expect(announceSessionChange).toHaveBeenCalled()
        expect(close).toHaveBeenCalled()
        unsubscribe()
    })

    it('passes a refused sign-in’s code on to the opening tab without announcing a session', async () => {
        const { listener, unsubscribe } = listenToPopup()

        renderWithProviders(<SocialSignInDone errorCode="access_denied" />)

        await waitFor(() => expect(listener).toHaveBeenCalledWith({ errorCode: 'access_denied' }))
        expect(announceSessionChange).not.toHaveBeenCalled()
        expect(close).toHaveBeenCalled()
        unsubscribe()
    })

    it('says the user is signed in when the browser keeps the window open', async () => {
        renderWithProviders(<SocialSignInDone errorCode={null} />)

        expect(await screen.findByText('You’re signed in. You can close this tab.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /home page/i })).toHaveAttribute('href', '/')
    })

    it('explains the failure when the browser keeps the window open', async () => {
        renderWithProviders(<SocialSignInDone errorCode="access_denied" />)

        expect(await screen.findByText('Sign-in was cancelled.')).toBeInTheDocument()
    })
})
