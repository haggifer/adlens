import type { Metadata } from 'next'
import PrivateRoute from '@/components/auth/PrivateRoute'
import StubPage from '@/components/layout/StubPage'

export const metadata: Metadata = {
    title: 'History',
    robots: { index: false, follow: false },
}

export default function HistoryPage() {
    return (
        <PrivateRoute>
            <StubPage title="History" subtitle="Your previous analyses will show up here." />
        </PrivateRoute>
    )
}
