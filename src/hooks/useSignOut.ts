'use client'

import { App } from 'antd'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, describeError } from '@/auth/errors'

// Resolves to whether the session ended, so a caller can keep its own UI (a confirmation) open after a failure.
export function useSignOut(): () => Promise<boolean> {
    const router = useRouter()
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

        router.push('/')

        return true
    }
}
