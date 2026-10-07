import { config } from '@/config'
import type { Metadata } from 'next'

export const SITE_NAME = 'AdLens'

export const SITE_TITLE = 'AdLens — Find out why your video ads underperform'

// Under the ~155 characters a search result shows before cutting the snippet.
export const SITE_DESCRIPTION =
    'AdLens checks your video ad against platform ad policies and creative best practices before launch, with timestamps and cited sources for every finding.'

// Without a `url`: a page that set one here would pass the home page's address on to every page that inherits it,
// so only the home page names its own (see page.tsx).
export const SITE_OPEN_GRAPH: NonNullable<Metadata['openGraph']> = {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
}

export const getSiteUrl = (path = '/'): string => new URL(path, config.siteUrl).toString()
