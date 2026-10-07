import type { MetadataRoute } from 'next'
import { getSiteUrl } from './site-metadata'

// Nothing is disallowed: the private pages keep out of the index with their noindex tag, which a crawler can only read
// on a page it may fetch.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/' },
        sitemap: getSiteUrl('/sitemap.xml'),
    }
}
