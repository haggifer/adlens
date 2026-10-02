import { AccountKind } from '@/auth/types'

export const isConfirmedKind = (kind: AccountKind | null) => kind === AccountKind.Member || kind === AccountKind.Admin
