import { AdWorkspace } from '@/components/upload/AdWorkspace'
import type { Metadata } from 'next'

// Resolved against metadataBase, so the http and non-www copies of the home page point at the www one.
export const metadata: Metadata = {
    alternates: { canonical: '/' },
}

export default function Home() {
    return <AdWorkspace />
}
