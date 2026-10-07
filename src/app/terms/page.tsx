import { LegalPage } from '@/components/legal/LegalPage'
import Terms from '@/content/legal/terms.mdx'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Terms of Use',
    alternates: { canonical: '/terms' },
}

export default function TermsPage() {
    return (
        <LegalPage title="Terms of Use" lastUpdated="October 2, 2026">
            <Terms />
        </LegalPage>
    )
}
