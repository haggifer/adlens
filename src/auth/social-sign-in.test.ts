import { getSocialSignInDoneUrl, postSocialSignInOutcome, subscribeSocialSignInOutcome } from '@/auth/social-sign-in'
import type { SocialSignInOutcome } from '@/auth/types'
import { waitFor } from '@testing-library/react'

describe('social sign-in channel', () => {
    it('sends the popup back to a page on this app’s own origin', () => {
        expect(getSocialSignInDoneUrl()).toBe(`${window.location.origin}/auth/done`)
    })

    it('delivers the popup’s outcome to a listening tab', async () => {
        const listener = jest.fn<void, [SocialSignInOutcome]>()
        const unsubscribe = subscribeSocialSignInOutcome(listener)

        postSocialSignInOutcome({ errorCode: 'access_denied' })

        await waitFor(() => expect(listener).toHaveBeenCalledWith({ errorCode: 'access_denied' }))
        unsubscribe()
    })

    it('stops delivering once unsubscribed', async () => {
        const listener = jest.fn()
        const witness = jest.fn()
        const unsubscribeWitness = subscribeSocialSignInOutcome(witness)

        subscribeSocialSignInOutcome(listener)()
        postSocialSignInOutcome({ errorCode: null })

        await waitFor(() => expect(witness).toHaveBeenCalled())
        expect(listener).not.toHaveBeenCalled()
        unsubscribeWitness()
    })
})
