import { AccountKind } from '@/auth/types'

export const checkEmailConfirmed = (kind: AccountKind | null) =>
    kind === AccountKind.Member || kind === AccountKind.Admin
