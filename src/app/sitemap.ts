import type { MetadataRoute } from 'next'
import { getSiteUrl } from './site-metadata'

// The pages open to search engines; every other page is noindex. Each of these also declares itself canonical.
const PUBLIC_PATHS = ['/', '/demo', '/privacy', '/terms']

export default function sitemap(): MetadataRoute.Sitemap {
    return PUBLIC_PATHS.map((path) => ({ url: getSiteUrl(path) }))
}
