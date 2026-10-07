import { config } from '@/config'
import type { MetadataRoute } from 'next'

// Nothing is disallowed: the private pages keep out of the index with their noindex tag, which a crawler can only read
// on a page it may fetch.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/' },
        sitemap: new URL('/sitemap.xml', config.siteUrl).toString(),
    }
}
