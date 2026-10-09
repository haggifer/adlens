import type { SocialSignInOutcome } from '@/auth/types'

export const SOCIAL_SIGN_IN_DONE_PATH = '/auth/done'

const CHANNEL_NAME = 'adlens.social-sign-in'

// Set just before a sign-in takes this tab to the provider, so only the page it comes back to explains an ?error=.
const REDIRECT_SIGN_IN_KEY = 'adlens.redirect-sign-in'

// Browsers without BroadcastChannel (Safari before 15.4) still get the session through Better Auth's own cross-tab
// refresh; only the dialog stays open.
const isChannelSupported = () => typeof BroadcastChannel !== 'undefined'

// Storage can be blocked (some private modes); then a failed redirect sign-in comes back without its notice.
export const markRedirectSignIn = () => {
    try {
        sessionStorage.setItem(REDIRECT_SIGN_IN_KEY, '1')
    } catch (err) {
        console.error(err)
    }
}

// Whether this tab left for a sign-in since the last page read it; forgets it, so it vouches for one page load only.
export const takeRedirectSignIn = (): boolean => {
    try {
        const isMarked = sessionStorage.getItem(REDIRECT_SIGN_IN_KEY) !== null

        sessionStorage.removeItem(REDIRECT_SIGN_IN_KEY)

        return isMarked
    } catch {
        return false
    }
}

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
