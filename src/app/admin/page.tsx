import { AdminView } from '@/components/admin/AdminView'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Admin',
    robots: { index: false, follow: false },
}

export default function AdminPage() {
    return (
        <PrivateRoute isAdminOnly>
            <AdminView />
        </PrivateRoute>
    )
}
