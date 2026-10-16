import { config } from '@/config'
import robots from './robots'
import sitemap from './sitemap'

const { origin } = new URL(config.siteUrl)

describe('sitemap', () => {
    it('lists the public pages as absolute addresses on the site', () => {
        const urls = sitemap().map(({ url }) => url)

        expect(urls).not.toHaveLength(0)
        urls.forEach((url) => expect(new URL(url).origin).toBe(origin))
    })
})

describe('robots', () => {
    it('names the sitemap', () => {
        expect(robots().sitemap).toBe(`${origin}/sitemap.xml`)
    })
})
