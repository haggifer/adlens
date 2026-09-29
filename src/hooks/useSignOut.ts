'use client'

import { App } from 'antd'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'
import { type AuthError, describeError } from '@/auth/errors'

export function useSignOut(): () => Promise<void> {
    const router = useRouter()
    const { signOut } = useAuth()
    const { notification } = App.useApp()

    return async () => {
        try {
            await signOut()
            router.push('/')
        } catch (error) {
            console.error(error)
            notification.error({ title: describeError(error as AuthError), placement: 'bottomRight' })
        }
    }
}
