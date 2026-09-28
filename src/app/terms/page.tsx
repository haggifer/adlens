import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import Terms from '@/content/legal/terms.mdx'

export const metadata: Metadata = {
    title: 'Terms of Use',
}

export default function TermsPage() {
    return (
        <LegalPage title="Terms of Use" lastUpdated="September 24, 2026">
            <Terms />
        </LegalPage>
    )
}
