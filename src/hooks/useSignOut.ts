'use client'

import { useAuth } from '@/auth/AuthContext'
import { type AuthError, describeError } from '@/auth/errors'
import { isGuardedPath } from '@/auth/guarded-paths'
import { App } from 'antd'
import { usePathname, useRouter } from 'next/navigation'

// Resolves to whether the session ended, so a caller can keep its own UI (a confirmation) open after a failure.
export function useSignOut(): () => Promise<boolean> {
    const router = useRouter()
    const pathname = usePathname()
    const { signOut } = useAuth()
    const { notification } = App.useApp()

    return async () => {
        try {
            await signOut()
        } catch (error) {
            console.error(error)
            notification.error({ title: describeError(error as AuthError), placement: 'bottomRight' })

            return false
        }

        if (isGuardedPath(pathname)) {
            router.push('/')
        }

        return true
    }
}
