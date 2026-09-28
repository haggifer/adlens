import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthContext'
import { listAccounts } from '@/auth/authClient'

export interface UseLinkedAccountsResult {
    // Provider ids of the user's sign-in methods ('credential' is email and password); undefined until loaded.
    providers?: string[]
    isLoading: boolean
}

const fetchProviders = async (): Promise<string[]> => {
    const { data, error } = await listAccounts()

    if (error || !data) {
        throw new Error(error?.message ?? 'Couldn’t load the sign-in methods')
    }

    return data.map((account) => account.providerId)
}

export function useLinkedAccounts(): UseLinkedAccountsResult {
    const { user } = useAuth()
    const { data, isLoading } = useQuery({
        queryKey: ['linkedAccounts', user?.id],
        queryFn: fetchProviders,
        enabled: Boolean(user),
    })

    return { providers: data, isLoading }
}
