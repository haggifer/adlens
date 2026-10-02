import { anonymousClient, inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { config } from '@/config'

export const authClient = createAuthClient({
    baseURL: config.apiBaseUrl,
    fetchOptions: { credentials: 'include' },
    plugins: [
        anonymousClient(),
        // The API's own user field, set by hand in its database; the session carries it, this only types it.
        inferAdditionalFields({ user: { isAdmin: { type: 'boolean', required: false, input: false } } }),
    ],
})

export const {
    changePassword,
    deleteUser,
    listAccounts,
    requestPasswordReset,
    resetPassword,
    revokeOtherSessions,
    sendVerificationEmail,
    signIn,
    signOut,
    signUp,
    useSession,
    verifyEmail,
} = authClient
