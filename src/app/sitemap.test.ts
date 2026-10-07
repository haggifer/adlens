import { config } from '@/config'
import robots from './robots'
import sitemap from './sitemap'

const { origin } = new URL(config.siteUrl)

describe('sitemap', () => {
    it('lists only the public pages, as absolute addresses on the site', () => {
        expect(sitemap().map(({ url }) => url)).toEqual([`${origin}/`, `${origin}/privacy`, `${origin}/terms`])
    })
})

describe('robots', () => {
    it('allows every page, so crawlers can read the private pages’ noindex, and names the sitemap', () => {
        const { rules, sitemap: sitemapUrl } = robots()

        expect(rules).toEqual({ userAgent: '*', allow: '/' })
        expect(sitemapUrl).toBe(`${origin}/sitemap.xml`)
    })
})
