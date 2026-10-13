import { ApiRequestError } from '@/api/errors'
import { authClient, signIn } from '@/auth/authClient'
import { isNetworkError, isRateLimited, runAuthQuery, runAuthRequest } from '@/auth/errors'
import { refreshSession } from '@/auth/session'
import { RequestErrorCode } from 'adlens-shared'

type SessionCheck = 'active' | 'none' | 'unknown'

// A `get-session` blip can leave the client's own state momentarily null for an otherwise signed-in member; a fresh
// fetch confirms there really is no session before signing in anonymously overwrites that member's cookie. Any
// error, a network failure included, counts as "couldn't tell": only a clean response with no user may proceed.
const checkSession = async (): Promise<SessionCheck> => {
    const { data, error } = await runAuthQuery(() => authClient.getSession())

    if (error) {
        return 'unknown'
    }

    return data?.user ? 'active' : 'none'
}

// Visitors get an anonymous session only when they first write something (an analysis, a preset), so crawlers and
// passers-by create no users.
const startAnonymousSession = async (): Promise<void> => {
    const error = await runAuthRequest(() => signIn.anonymous())

    if (!error) {
        return
    }

    if (isRateLimited(error)) {
        throw new ApiRequestError(RequestErrorCode.RateLimited)
    }

    throw new ApiRequestError(isNetworkError(error) ? RequestErrorCode.Unavailable : RequestErrorCode.Internal)
}

// Makes sure there is a session before a write that needs one, for a page whose own state has none.
export const ensureSession = async (): Promise<void> => {
    const sessionCheck = await checkSession()

    if (sessionCheck === 'unknown') {
        throw new ApiRequestError(RequestErrorCode.Unavailable)
    }

    if (sessionCheck === 'none') {
        await startAnonymousSession()
    }

    // The cookie holds a session this tab's state missed (its first fetch failed, or another tab signed in):
    // without catching up, the page would ask to sign in.
    if (sessionCheck === 'active') {
        refreshSession()
    }
}
