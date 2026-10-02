import { listAccounts } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, runAuthQuery } from '@/auth/errors'
import { useQuery } from '@tanstack/react-query'

export interface UseLinkedAccountsResult {
    // Provider ids of the user's sign-in methods ('credential' is email and password); undefined until loaded.
    providers?: string[]
    isLoading: boolean
    // describeError gives its copy.
    error: AuthError | null
}

const fetchProviders = async (): Promise<string[]> => {
    const { data, error } = await runAuthQuery(() => listAccounts())

    if (error || !data) {
        throw error ?? {}
    }

    return data.map((account) => account.providerId)
}

export function useLinkedAccounts(): UseLinkedAccountsResult {
    const { user } = useAuth()
    const { data, isLoading, error } = useQuery<string[], AuthError>({
        queryKey: ['linkedAccounts', user?.id],
        queryFn: fetchProviders,
        enabled: Boolean(user),
    })

    return { providers: data, isLoading, error }
}
