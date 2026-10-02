import { AccountSettings } from '@/components/account/AccountSettings'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Account',
    robots: { index: false, follow: false },
}

export default function AccountPage() {
    return (
        <PrivateRoute isAccountOnly>
            <AccountSettings />
        </PrivateRoute>
    )
}
