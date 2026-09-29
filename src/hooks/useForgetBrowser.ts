'use client'

import { App } from 'antd'
import { MODAL_WIDTH } from '@/design/theme'
import { useSignOut } from '@/hooks/useSignOut'

// Signing an anonymous session out strands its analyses: nothing links them to an account, so they can't be reached
// again. On a shared browser that's the point, but it must be deliberate.
export function useForgetBrowser(): () => Promise<void> {
    const { modal } = App.useApp()
    const signOut = useSignOut()

    const forget = async () => {
        const isSignedOut = await signOut()

        // A rejected onOk keeps the confirmation open for another try; useSignOut has already said what went wrong.
        if (!isSignedOut) {
            throw new Error('Sign-out failed')
        }
    }

    // Awaiting the confirmation puts antd in its await mode, where it keeps that rejection to itself instead of
    // rethrowing it as an unhandled one.
    return async () => {
        await modal.confirm({
            title: 'Forget this browser?',
            width: MODAL_WIDTH,
            content: 'Analyses you ran here without an account will no longer be reachable.',
            okText: 'Forget',
            okButtonProps: { danger: true },
            onOk: forget,
        })
    }
}
