import { describeError } from '@/auth/errors'
import { refreshSession } from '@/auth/session'
import { subscribeSocialSignInOutcome } from '@/auth/social-sign-in'
import type { SocialSignInOutcome } from '@/auth/types'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { App } from 'antd'
import { useEffect } from 'react'

interface UseSocialSignInResultOptions {
    isPending: boolean
    // Called once the popup reports, whatever the outcome.
    onSettled: () => void
}

// Listens, while a Google / GitHub sign-in runs in a popup, for the outcome the popup's landing page reports.
export function useSocialSignInResult({ isPending, onSettled }: UseSocialSignInResultOptions): void {
    const { notification } = App.useApp()
    const setView = useAuthModalStore((s) => s.setView)

    useEffect(() => {
        if (!isPending) {
            return
        }

        const handleOutcome = ({ errorCode }: SocialSignInOutcome) => {
            onSettled()

            if (errorCode) {
                notification.error({ title: describeError({ code: errorCode }), placement: 'bottomRight' })
                return
            }

            refreshSession()
            setView(null)
        }

        return subscribeSocialSignInOutcome(handleOutcome)
    }, [isPending, notification, onSettled, setView])
}
