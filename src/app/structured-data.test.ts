import { getSiteUrl } from './site-metadata'
import { buildHomeStructuredData, serializeStructuredData } from './structured-data'

describe('buildHomeStructuredData', () => {
    it('links its nodes into one graph on the home address', () => {
        const graph = buildHomeStructuredData()['@graph']
        const ids = new Set(graph.map((node) => node['@id']))
        const publisherIds = graph.flatMap((node) => (node.publisher ? [node.publisher['@id']] : []))

        expect(ids.size).toBe(graph.length)
        expect(publisherIds).not.toHaveLength(0)
        publisherIds.forEach((id) => expect(ids).toContain(id))
        graph.forEach((node) => expect(node.url).toBe(getSiteUrl('/')))
    })
})

describe('serializeStructuredData', () => {
    it('escapes < so no value can close the script tag', () => {
        expect(serializeStructuredData({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
    })
})
