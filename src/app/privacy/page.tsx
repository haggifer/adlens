import { buildPublicPageMetadata } from '@/app/site-metadata'
import { LegalPage } from '@/components/legal/LegalPage'
import Privacy from '@/content/legal/privacy.mdx'
import type { Metadata, ResolvingMetadata } from 'next'

export const generateMetadata = (_props: unknown, parent: ResolvingMetadata): Promise<Metadata> =>
    buildPublicPageMetadata({ title: 'Privacy Policy', path: '/privacy' }, parent)

export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy Policy" lastUpdated="October 14, 2026">
            <Privacy />
        </LegalPage>
    )
}
