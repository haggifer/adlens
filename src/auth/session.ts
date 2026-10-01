import { authClient } from '@/auth/authClient'
import { type AuthError, runAuthQuery } from '@/auth/errors'

// Failures the API can answer after it has already signed the account in: moving the anonymous history failed, or the
// confirmation email couldn't be sent.
const AFTER_SIGN_IN_CODES = new Set(['ACCOUNT_LINK_FAILED', 'EMAIL_NOT_SENT'])

// Whether a sign-in or sign-up that failed still left an account signed in; if so, the session state catches up.
export const checkSignedInDespite = async (error: AuthError): Promise<boolean> => {
    if (!AFTER_SIGN_IN_CODES.has(error.code ?? '')) {
        return false
    }

    const { data } = await runAuthQuery(() => authClient.getSession())
    const isSignedIn = Boolean(data?.user && !data.user.isAnonymous)

    if (isSignedIn) {
        authClient.$store.notify('$sessionSignal')
    }

    return isSignedIn
}
