import { buildPublicPageMetadata } from '@/app/site-metadata'
import { LegalPage } from '@/components/legal/LegalPage'
import Terms from '@/content/legal/terms.mdx'
import type { Metadata, ResolvingMetadata } from 'next'

export const generateMetadata = (_props: unknown, parent: ResolvingMetadata): Promise<Metadata> =>
    buildPublicPageMetadata({ title: 'Terms of Use', path: '/terms' }, parent)

export default function TermsPage() {
    return (
        <LegalPage title="Terms of Use" lastUpdated="October 2, 2026">
            <Terms />
        </LegalPage>
    )
}
