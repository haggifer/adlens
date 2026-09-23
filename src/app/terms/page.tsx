import type { Metadata } from 'next'
import StubPage from '@/components/layout/StubPage'

export const metadata: Metadata = {
    title: 'Terms of Use',
}

export default function TermsPage() {
    return <StubPage title="Terms of Use" subtitle="The terms of use are being prepared and will be published here." />
}
