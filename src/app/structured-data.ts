import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from './site-metadata'

// One graph, so the three nodes reference each other by @id instead of repeating themselves. WebSite gives Google the
// site name it shows above the result; Organization names the brand and its logo; WebApplication says what the page
// is. Free while every account gets a weekly allowance at no charge: revisit `offers` once a paid plan exists.
export const buildHomeStructuredData = () => {
    const homeUrl = getSiteUrl('/')
    const organizationId = `${homeUrl}#organization`

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${homeUrl}#website`,
                url: homeUrl,
                name: SITE_NAME,
                description: SITE_DESCRIPTION,
                inLanguage: 'en',
                publisher: { '@id': organizationId },
            },
            {
                '@type': 'Organization',
                '@id': organizationId,
                name: SITE_NAME,
                url: homeUrl,
                logo: getSiteUrl('/apple-icon.png'),
            },
            {
                '@type': 'WebApplication',
                '@id': `${homeUrl}#app`,
                name: SITE_NAME,
                url: homeUrl,
                description: SITE_DESCRIPTION,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Any',
                browserRequirements: 'Requires JavaScript',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                publisher: { '@id': organizationId },
            },
        ],
    }
}

// JSON.stringify leaves `<` as is, so a `</script>` inside a value would close the tag early.
export const serializeStructuredData = (data: object): string => JSON.stringify(data).replace(/</g, '\\u003c')
