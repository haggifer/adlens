import { createAuthClient } from 'better-auth/react'
import { config } from '@/config'

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
    verifyEmail,
} = authClient
