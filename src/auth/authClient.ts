import { createAuthClient } from 'better-auth/react'
import { config } from '@/config'

// Where the email confirmation link lands. Sign-in passes it too: signing in unconfirmed emails a fresh link, and
// without it Better Auth sends that link to "/" on the API's own origin.
export const EMAIL_VERIFIED_URL = `${config.siteUrl}/auth/verified`

export const authClient = createAuthClient({ baseURL: config.apiBaseUrl, fetchOptions: { credentials: 'include' } })

export const {
    changePassword,
    deleteUser,
    requestPasswordReset,
    resetPassword,
    revokeOtherSessions,
    signIn,
    signOut,
    signUp,
    useSession,
} = authClient
