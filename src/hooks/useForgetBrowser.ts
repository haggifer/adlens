'use client'

import { App } from 'antd'
import { MODAL_WIDTH } from '@/design/theme'
import { useSignOut } from '@/hooks/useSignOut'

// Signing an anonymous session out strands its analyses: nothing links them to an account, so they can't be reached
// again. On a shared browser that's the point, but it must be deliberate.
export function useForgetBrowser(): () => void {
    const { modal } = App.useApp()
    const signOut = useSignOut()

    return () => {
        modal.confirm({
            title: 'Forget this browser?',
            width: MODAL_WIDTH,
            content: 'Analyses you ran here without an account will no longer be reachable.',
            okText: 'Forget',
            okButtonProps: { danger: true },
            onOk: signOut,
        })
    }
}
