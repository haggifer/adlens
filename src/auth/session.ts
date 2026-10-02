import { authClient } from '@/auth/authClient'
import { type AuthError, runAuthQuery } from '@/auth/errors'

// Failures the API can answer after it has already signed the account in: moving the anonymous history failed, or the
// confirmation email couldn't be sent.
const AFTER_SIGN_IN_CODES = new Set(['ACCOUNT_LINK_FAILED', 'EMAIL_NOT_SENT'])

// Has Better Auth fetch the session again, for a change the API made that the client didn't ask for.
export const refreshSession = () => authClient.$store.notify('$sessionSignal')

// Whether a sign-in or sign-up that failed still left an account signed in; if so, the session state catches up.
export const checkSignedInDespite = async (error: AuthError): Promise<boolean> => {
    if (!AFTER_SIGN_IN_CODES.has(error.code ?? '')) {
        return false
    }

    const { data } = await runAuthQuery(() => authClient.getSession())
    const isSignedIn = Boolean(data?.user && !data.user.isAnonymous)

    if (isSignedIn) {
        refreshSession()
    }

    return isSignedIn
}
