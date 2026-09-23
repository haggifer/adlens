// Better Auth errors carry a stable `code`; anything unmapped falls back to a generic line rather than raw server text.
const AUTH_ERROR_COPY: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
    INVALID_PASSWORD: 'Wrong password.',
    INVALID_EMAIL: 'Enter a valid email.',
    EMAIL_NOT_VERIFIED: 'Confirm your email first — we’ve just sent you a new link.',
    USER_ALREADY_EXISTS: 'An account with this email already exists. Sign in instead.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists. Sign in instead.',
    PASSWORD_TOO_SHORT: 'The password is too short.',
    PASSWORD_TOO_LONG: 'The password is too long.',
    INVALID_TOKEN: 'This link is invalid or has already been used.',
    TOKEN_EXPIRED: 'This link has expired. Request a new one.',
    SESSION_EXPIRED: 'Your session has expired. Sign in again.',
    NETWORK_ERROR: 'Couldn’t reach AdLens. Check your connection and try again.',
}

const RATE_LIMITED_STATUS = 429

export interface AuthError {
    code?: string
    message?: string
    status?: number
}

export const describeError = (error: AuthError | null): string => {
    if (error?.status === RATE_LIMITED_STATUS) {
        return 'Too many attempts. Wait a minute and try again.'
    }

    return (error?.code && AUTH_ERROR_COPY[error.code]) || 'Something went wrong. Please try again.'
}

// Better Auth returns server-side failures as `{ error }` but throws when the request never reaches the API;
// this folds both into the returned error.
export const runAuthRequest = async (
    request: () => Promise<{ error: AuthError | null }>,
): Promise<AuthError | null> => {
    try {
        const { error } = await request()

        return error
    } catch (err) {
        console.error(err)

        return { code: 'NETWORK_ERROR' }
    }
}
