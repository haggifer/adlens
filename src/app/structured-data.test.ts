import { config } from '@/config'
import { metadata as homeMetadata } from './page'
import { SITE_DESCRIPTION, SITE_OPEN_GRAPH } from './site-metadata'
import { buildHomeStructuredData, serializeStructuredData } from './structured-data'

jest.mock('@/components/upload/AdWorkspace', () => ({ AdWorkspace: () => null }))

const homeUrl = `${new URL(config.siteUrl).origin}/`

describe('buildHomeStructuredData', () => {
    it('describes the site, its publisher and the app as one linked graph on the home address', () => {
        const graph = buildHomeStructuredData()['@graph']
        const ids = graph.map((node) => node['@id'])

        expect(graph.map((node) => node['@type'])).toEqual(['WebSite', 'Organization', 'WebApplication'])
        expect(ids).toEqual([`${homeUrl}#website`, `${homeUrl}#organization`, `${homeUrl}#app`])
        graph.forEach((node) => expect(node.url).toBe(homeUrl))
        expect(graph[0].publisher).toEqual({ '@id': `${homeUrl}#organization` })
        expect(graph[2].description).toBe(SITE_DESCRIPTION)
    })
})

describe('serializeStructuredData', () => {
    it('escapes < so no value can close the script tag', () => {
        expect(serializeStructuredData({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
    })
})

describe('site metadata', () => {
    it('keeps the shared Open Graph tags free of an address, which only the home page names', () => {
        expect(SITE_OPEN_GRAPH).not.toHaveProperty('url')
        expect(homeMetadata.openGraph).toMatchObject({ ...SITE_OPEN_GRAPH, url: '/' })
        expect(homeMetadata.alternates?.canonical).toBe('/')
    })

    it('fits the description into what a search result shows', () => {
        expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(155)
    })
})
