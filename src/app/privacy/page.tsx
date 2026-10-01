import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import Privacy from '@/content/legal/privacy.mdx'

export const metadata: Metadata = {
    title: 'Privacy Policy',
}

export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy Policy" lastUpdated="October 1, 2026">
            <Privacy />
        </LegalPage>
    )
}
