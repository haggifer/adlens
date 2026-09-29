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
    EMAIL_NOT_SENT:
        'We couldn’t send the email. Try again in a few minutes; if you just signed up, sign in to get a new link.',
    DISPOSABLE_EMAIL: 'Sign up with a permanent email address. Temporary inboxes aren’t accepted.',
    ACCOUNT_LINK_FAILED:
        'You’re signed in, but your earlier analyses couldn’t be moved. Contact us and we’ll move them.',
    NETWORK_ERROR: 'Couldn’t reach AdLens. Check your connection and try again.',
    // Google / GitHub sign-in: Better Auth sends the user back with ?error=<code>.
    access_denied: 'Sign-in was cancelled.',
    account_not_linked:
        'This email already has an AdLens account. Sign in with your email and password, or reset the password if you never confirmed it.',
    unable_to_link_account: 'We couldn’t connect that account. Try again, or sign in with your email.',
    email_not_found: 'GitHub didn’t share your email address. Add a verified email on GitHub, then try again.',
    email_not_verified: 'Confirm your email first — we’ve just sent you a link.',
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

    if (error?.code && Object.hasOwn(AUTH_ERROR_COPY, error.code)) {
        return AUTH_ERROR_COPY[error.code]
    }

    return 'Something went wrong. Please try again.'
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
