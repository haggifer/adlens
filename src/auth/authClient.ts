import { anonymousClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { config } from '@/config'

export const authClient = createAuthClient({
    baseURL: config.apiBaseUrl,
    fetchOptions: { credentials: 'include' },
    plugins: [anonymousClient()],
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
