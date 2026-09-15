import { createAuthClient } from 'better-auth/react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'
const TOKEN_KEY = 'adlens_bearer'

export const getBearerToken = (): string | null => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

// Better Auth issues a bearer token in the `set-auth-token` response header (bearer plugin). We stash
// it and send it back as an Authorization header, which is the simplest cross-origin (Vercel → Cloud
// Run) flow — no third-party cookies.
export const authClient = createAuthClient({
    baseURL: API_BASE,
    fetchOptions: {
        onSuccess: (ctx) => {
            const token = ctx.response.headers.get('set-auth-token')

            if (token) {
                try {
                    localStorage.setItem(TOKEN_KEY, token)
                } catch {
                    // ignore storage failures (private mode)
                }
            }
        },
        auth: {
            type: 'Bearer',
            token: () => getBearerToken() ?? '',
        },
    },
})

export const { signIn, signUp, useSession } = authClient

export const logout = async (): Promise<void> => {
    await authClient.signOut()

    try {
        localStorage.removeItem(TOKEN_KEY)
    } catch {
        // ignore
    }
}
