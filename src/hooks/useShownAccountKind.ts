import { useAuth } from '@/auth/AuthContext'
import { AccountKind } from '@/auth/types'

export interface UseShownAccountKindResult {
    // The kind of account the header draws: the real one, or while the session loads, the one this browser last had.
    kind: AccountKind | null
    // Drawn from the snapshot, so nothing that acts on the session may respond yet.
    isInert: boolean
}

export function useShownAccountKind(): UseShownAccountKindResult {
    const { isInitializing, accountKind, snapshotKind } = useAuth()

    return isInitializing ? { kind: snapshotKind, isInert: true } : { kind: accountKind, isInert: false }
}
