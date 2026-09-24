'use client'

import { App } from 'antd'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'

export default function useSignOut(): () => Promise<void> {
    const router = useRouter()
    const { signOut } = useAuth()
    const { notification } = App.useApp()

    return async () => {
        try {
            await signOut()
            router.push('/')
        } catch (error) {
            console.error(error)
            notification.error({ title: 'Could not sign out. Please try again.', placement: 'bottomRight' })
        }
    }
}
