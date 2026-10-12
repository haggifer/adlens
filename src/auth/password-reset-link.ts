// The password-reset email links to the home page with this parameter, which opens the reset form in the auth modal.
export const RESET_PASSWORD_TOKEN_PARAM = 'reset-password-token'

export const toPasswordResetPath = (token: string) =>
    `/?${new URLSearchParams({ [RESET_PASSWORD_TOKEN_PARAM]: token }).toString()}`
