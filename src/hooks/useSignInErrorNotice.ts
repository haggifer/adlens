import { describeError } from '@/auth/errors'
import { SOCIAL_SIGN_IN_DONE_PATH } from '@/auth/social-sign-in'
import { App } from 'antd'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const ERROR_PARAMS = ['error', 'error_description']

// The same key makes React's development double-run of the effect update one notification instead of adding two.
const NOTICE_KEY = 'sign-in-error'

const getQueryWithoutError = (searchParams: URLSearchParams) => {
    const rest = new URLSearchParams(searchParams)

    ERROR_PARAMS.forEach((param) => rest.delete(param))

    return rest.toString()
}

// A failed Google / GitHub sign-in that ran in this tab, because its popup was blocked, comes back to the page it
// started on with ?error=<code>: explain it once, then drop the parameters so a reload or a shared link doesn't
// repeat it.
export function useSignInErrorNotice(): void {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const { notification } = App.useApp()

    // The sign-in popup's landing page reports its own error, and needs the code to stay in its address.
    const code = pathname === SOCIAL_SIGN_IN_DONE_PATH ? null : searchParams.get('error')

    useEffect(() => {
        if (!code) {
            return
        }

        notification.error({ key: NOTICE_KEY, title: describeError({ code }), placement: 'bottomRight' })

        const query = getQueryWithoutError(searchParams)

        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, [code, notification, pathname, router, searchParams])
}
