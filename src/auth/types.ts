export type SocialProvider = 'google' | 'github'

export enum AccountKind {
    Anonymous = 'anonymous',
    // Signed up, but hasn't opened the confirmation link yet.
    Unconfirmed = 'unconfirmed',
    Member = 'member',
    Admin = 'admin',
}
