import type { Metadata } from 'next'
import { AccountSettings } from '@/components/account/AccountSettings'
import { PrivateRoute } from '@/components/auth/PrivateRoute'

export const metadata: Metadata = {
    title: 'Account',
    robots: { index: false, follow: false },
}

export default function AccountPage() {
    return (
        <PrivateRoute>
            <AccountSettings />
        </PrivateRoute>
    )
}
