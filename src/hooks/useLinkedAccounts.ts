import { ApiRequestError } from '@/api/errors'
import { listAccounts } from '@/auth/authClient'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, runAuthQuery } from '@/auth/errors'
import { useQuery } from '@tanstack/react-query'
import { RequestErrorCode } from 'adlens-shared'

export interface UseLinkedAccountsResult {
    // Provider ids of the user's sign-in methods ('credential' is email and password); undefined until loaded.
    providers?: string[]
    isLoading: boolean
    // An ApiRequestError carries its copy as its message; describeError gives an AuthError's.
    error: AuthError | ApiRequestError | null
}

const UNAUTHENTICATED_STATUS = 401

const fetchProviders = async (): Promise<string[]> => {
    const { data, error } = await runAuthQuery(() => listAccounts())

    // As an API call's would, a lost session reaches the query cache's handler, which asks to sign in again.
    if (error?.status === UNAUTHENTICATED_STATUS) {
        throw new ApiRequestError(RequestErrorCode.Unauthenticated)
    }

    if (error || !data) {
        throw error ?? {}
    }

    return data.map((account) => account.providerId)
}

export function useLinkedAccounts(): UseLinkedAccountsResult {
    const { user } = useAuth()
    const { data, isLoading, error } = useQuery<string[], AuthError | ApiRequestError>({
        queryKey: ['linkedAccounts', user?.id],
        queryFn: fetchProviders,
        enabled: Boolean(user),
    })

    return { providers: data, isLoading, error }
}
