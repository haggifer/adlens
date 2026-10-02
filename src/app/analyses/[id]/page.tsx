import { AnalysisView } from '@/components/analysis/AnalysisView'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Analysis',
    robots: { index: false, follow: false },
}

interface IProps {
    params: Promise<{ id: string }>
}

export default async function AnalysisPage({ params }: IProps) {
    const { id } = await params

    return (
        <PrivateRoute>
            <AnalysisView jobId={id} />
        </PrivateRoute>
    )
}
