export type SocialProvider = 'google' | 'github'

export enum AccountKind {
    Anonymous = 'anonymous',
    // Signed up, but hasn't opened the confirmation link yet.
    Unconfirmed = 'unconfirmed',
    Member = 'member',
    Admin = 'admin',
}

// What the social sign-in popup reports to the tab that opened it: Better Auth's error code, or null on success.
export interface SocialSignInOutcome {
    errorCode: string | null
}
