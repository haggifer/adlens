import { RESET_PASSWORD_TOKEN_PARAM } from '@/auth/password-reset-link'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const getQueryWithoutToken = (searchParams: URLSearchParams) => {
    const rest = new URLSearchParams(searchParams)

    rest.delete(RESET_PASSWORD_TOKEN_PARAM)

    return rest.toString()
}

// A password-reset link opens the reset form in the auth modal, over the page it lands on. The token then leaves the
// address, so a reload doesn't reopen the form and the history doesn't keep it.
export function usePasswordResetLink(): void {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const setView = useAuthModalStore((s) => s.setView)
    const setResetToken = useAuthModalStore((s) => s.setResetToken)

    const token = searchParams.get(RESET_PASSWORD_TOKEN_PARAM)

    useEffect(() => {
        if (!token) {
            return
        }

        setResetToken(token)
        setView('reset')

        const query = getQueryWithoutToken(searchParams)

        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, [token, pathname, router, searchParams, setResetToken, setView])
}
