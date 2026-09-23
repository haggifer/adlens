import type { Metadata } from 'next'
import PrivateRoute from '@/components/auth/PrivateRoute'
import HistoryTable from '@/components/history/HistoryTable'

export const metadata: Metadata = {
    title: 'History',
    robots: { index: false, follow: false },
}

export default function HistoryPage() {
    return (
        <PrivateRoute>
            <HistoryTable />
        </PrivateRoute>
    )
}
