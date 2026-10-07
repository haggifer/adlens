import { DemoView } from '@/components/demo/DemoView'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Example reports',
    description:
        'Real video ads analyzed by AdLens: a policy risk, ads in the wrong format for a placement, and an ad ready to run, each with its full report.',
    alternates: { canonical: '/demo' },
}

export default function DemoPage() {
    return <DemoView />
}
