import type { SocialSignInOutcome } from '@/auth/types'

export const SOCIAL_SIGN_IN_DONE_PATH = '/auth/done'

const CHANNEL_NAME = 'adlens.social-sign-in'

// Browsers without BroadcastChannel (Safari before 15.4) still get the session through Better Auth's own cross-tab
// refresh; only the dialog stays open.
const isChannelSupported = () => typeof BroadcastChannel !== 'undefined'

export const getSocialSignInDoneUrl = () => `${window.location.origin}${SOCIAL_SIGN_IN_DONE_PATH}`

// A BroadcastChannel rather than window.opener: the providers' pages set Cross-Origin-Opener-Policy, which cuts the
// popup off from its opener for good.
export const postSocialSignInOutcome = (outcome: SocialSignInOutcome) => {
    if (!isChannelSupported()) {
        return
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)

    channel.postMessage(outcome)
    channel.close()
}

export const subscribeSocialSignInOutcome = (listener: (outcome: SocialSignInOutcome) => void): (() => void) => {
    if (!isChannelSupported()) {
        return () => {}
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)

    channel.onmessage = (event: MessageEvent<SocialSignInOutcome>) => listener(event.data)

    return () => channel.close()
}
