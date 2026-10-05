import { LegalPage } from '@/components/legal/LegalPage'
import Privacy from '@/content/legal/privacy.mdx'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Privacy Policy',
}

export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy Policy" lastUpdated="October 5, 2026">
            <Privacy />
        </LegalPage>
    )
}
