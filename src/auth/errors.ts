export interface AuthError {
    code?: string
    message?: string
    status?: number
}

export interface AuthQueryResult<T> {
    data: T | null
    error: AuthError | null
}

// Better Auth errors carry a stable `code`; anything unmapped falls back to a generic line rather than raw server text.
const AUTH_ERROR_COPY: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
    INVALID_PASSWORD: 'Wrong password.',
    INVALID_EMAIL: 'Enter a valid email.',
    USER_ALREADY_EXISTS: 'This email is already in use. Sign in instead.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'This email is already in use. Sign in instead.',
    PASSWORD_TOO_SHORT: 'The password is too short.',
    PASSWORD_TOO_LONG: 'The password is too long.',
    INVALID_TOKEN: 'This link is invalid or has already been used.',
    TOKEN_EXPIRED: 'This link has expired. Request a new one.',
    SESSION_EXPIRED: 'You were signed out. Sign in again.',
    EMAIL_NOT_SENT: 'We couldn’t send the email. Try again in a few minutes.',
    DISPOSABLE_EMAIL: 'Sign up with a permanent email address. Temporary inboxes aren’t accepted.',
    // Sign-up or sign-in succeeded, but the anonymous history couldn't be moved to the account.
    ACCOUNT_LINK_FAILED:
        'You’re signed in, but your earlier analyses couldn’t be moved. Contact us and we’ll move them.',
    // The confirmation link: it needs a session signed in as its own account.
    SIGN_IN_REQUIRED: 'Sign in to confirm your email.',
    EMAIL_MISMATCH: 'This link is for a different account. Sign out, then open it again.',
    // A resend after the email was confirmed in another tab or on another device.
    EMAIL_ALREADY_VERIFIED: 'Your email is already confirmed.',
    NETWORK_ERROR: 'Couldn’t reach AdLens. Check your connection and try again.',
    // Google / GitHub sign-in: Better Auth sends the user back with ?error=<code>.
    access_denied: 'Sign-in was cancelled.',
    // Better Auth links a social sign-in to an existing account only once that account's email is confirmed.
    account_not_linked:
        'This email already has an AdLens account. Sign in with your email and password, then confirm your email (Confirm email in the header) to use Google or GitHub with it.',
    unable_to_link_account: 'We couldn’t connect that account. Try again, or sign in with your email.',
    email_not_found: 'GitHub didn’t share your email address. Add a verified email on GitHub, then try again.',
    email_not_verified: 'Confirm your email first — we’ve just sent you a link.',
}

const RATE_LIMITED_STATUS = 429
const NETWORK_ERROR_CODE = 'NETWORK_ERROR'
const ALREADY_IN_USE_CODES = new Set(['USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'])

export const isRateLimited = (error: AuthError | null): boolean => error?.status === RATE_LIMITED_STATUS

export const isNetworkError = (error: AuthError | null): boolean => error?.code === NETWORK_ERROR_CODE

// A sign-up for an address that already has an account.
export const isEmailInUse = (error: AuthError | null): boolean => ALREADY_IN_USE_CODES.has(error?.code ?? '')

export const describeError = (error: AuthError | null): string => {
    if (isRateLimited(error)) {
        return 'Too many attempts. Wait a minute and try again.'
    }

    if (error?.code && Object.hasOwn(AUTH_ERROR_COPY, error.code)) {
        return AUTH_ERROR_COPY[error.code]
    }

    return 'Something went wrong. Please try again.'
}

// Confirming an email answers USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL when another account already confirmed the same
// mailbox (an alias such as ann+x@ included): unlike at sign-up, this account exists and is signed in, so the other one
// is the way in.
export const isMailboxTaken = (error: AuthError | null): boolean =>
    error?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'

export const describeConfirmError = (error: AuthError | null): string => {
    if (isMailboxTaken(error) && !isRateLimited(error)) {
        return 'Another AdLens account has already confirmed this mailbox. Sign in to that account instead.'
    }

    return describeError(error)
}

// A password reset answers INVALID_TOKEN for an expired link as well as a used or mistyped one, so the copy covers both.
export const describeResetError = (error: AuthError | null): string => {
    if (error?.code === 'INVALID_TOKEN' && !isRateLimited(error)) {
        return 'This link has expired or has already been used. Request a new one.'
    }

    return describeError(error)
}

// Better Auth returns server-side failures as `{ error }` but throws when the request never reaches the API;
// this folds both into the returned error.
export const runAuthQuery = async <T>(
    request: () => Promise<{ data?: T | null; error: AuthError | null }>,
): Promise<AuthQueryResult<T>> => {
    try {
        const { data, error } = await request()

        return { data: error ? null : (data ?? null), error }
    } catch (err) {
        console.error(err)

        return { data: null, error: { code: NETWORK_ERROR_CODE } }
    }
}

// For a request whose answer only matters when it fails.
export const runAuthRequest = async (
    request: () => Promise<{ error: AuthError | null }>,
): Promise<AuthError | null> => {
    const { error } = await runAuthQuery(request)

    return error
}
