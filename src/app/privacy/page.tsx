import type { Metadata } from 'next'
import StubPage from '@/components/layout/StubPage'

export const metadata: Metadata = {
    title: 'Privacy Policy',
}

export default function PrivacyPage() {
    return (
        <StubPage title="Privacy Policy" subtitle="The privacy policy is being prepared and will be published here." />
    )
}
