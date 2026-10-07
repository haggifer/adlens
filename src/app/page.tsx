import { AdWorkspace } from '@/components/upload/AdWorkspace'
import type { Metadata } from 'next'
import { SITE_OPEN_GRAPH } from './site-metadata'
import { buildHomeStructuredData, serializeStructuredData } from './structured-data'

// Resolved against metadataBase, so the http and non-www copies of the home page point at the www one.
export const metadata: Metadata = {
    alternates: { canonical: '/' },
    openGraph: { ...SITE_OPEN_GRAPH, url: '/' },
}

export default function Home() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeStructuredData(buildHomeStructuredData()) }}
            />
            <AdWorkspace />
        </>
    )
}
