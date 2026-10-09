import { config } from '@/config'
import type { Metadata, ResolvingMetadata } from 'next'

interface PublicPage {
    title: string
    // The site's description when the page has none of its own.
    description?: string
    path: string
}

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

// The large card shows opengraph-image.tsx, which X reads in place of a twitter:image of its own.
export const SITE_TWITTER: NonNullable<Metadata['twitter']> = {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
}

// An indexable page's own title, description and address, in its link previews too. Its openGraph replaces the root
// layout's whole object, share image included, so the image the layout resolved is carried over.
export const buildPublicPageMetadata = async (
    { title, description = SITE_DESCRIPTION, path }: PublicPage,
    parent: ResolvingMetadata,
): Promise<Metadata> => {
    const { openGraph } = await parent
    const shareTitle = `${title} · ${SITE_NAME}`

    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { ...SITE_OPEN_GRAPH, title: shareTitle, description, url: path, images: openGraph?.images },
        twitter: { ...SITE_TWITTER, title: shareTitle, description },
    }
}

export const getSiteUrl = (path = '/'): string => new URL(path, config.siteUrl).toString()
