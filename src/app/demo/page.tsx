import { buildPublicPageMetadata } from '@/app/site-metadata'
import { DemoView } from '@/components/demo/DemoView'
import type { Metadata, ResolvingMetadata } from 'next'

export const generateMetadata = (_props: unknown, parent: ResolvingMetadata): Promise<Metadata> =>
    buildPublicPageMetadata(
        {
            title: 'Example reports',
            description:
                'Real video ads analyzed by AdLens: a policy risk, ads in the wrong format for a placement, and an ad ready to run, each with its full report.',
            path: '/demo',
        },
        parent,
    )

export default function DemoPage() {
    return <DemoView />
}
