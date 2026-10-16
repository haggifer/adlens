import type { ResolvingMetadata } from 'next'
import { buildPublicPageMetadata, SITE_DESCRIPTION } from './site-metadata'

const SHARE_IMAGE = { url: 'https://www.example.com/opengraph-image.png', width: 1200, height: 630 }

const PARENT = Promise.resolve({ openGraph: { images: [SHARE_IMAGE] } }) as unknown as ResolvingMetadata

describe('buildPublicPageMetadata', () => {
    it('gives the page its own title, description and address, in link previews too, keeping the share image', async () => {
        const metadata = await buildPublicPageMetadata(
            { title: 'Example reports', description: 'Real ads, analyzed.', path: '/demo' },
            PARENT,
        )

        expect(metadata).toMatchObject({
            title: 'Example reports',
            description: 'Real ads, analyzed.',
            alternates: { canonical: '/demo' },
            openGraph: {
                title: 'Example reports · AdLens',
                description: 'Real ads, analyzed.',
                url: '/demo',
                images: [SHARE_IMAGE],
            },
            twitter: {
                title: 'Example reports · AdLens',
                description: 'Real ads, analyzed.',
            },
        })
    })

    it('describes a page without a description of its own as the site', async () => {
        const metadata = await buildPublicPageMetadata({ title: 'Terms of Use', path: '/terms' }, PARENT)

        expect(metadata.openGraph).toMatchObject({ title: 'Terms of Use · AdLens', description: SITE_DESCRIPTION })
    })
})
