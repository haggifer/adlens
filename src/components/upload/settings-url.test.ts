import { Market, Placement, Platform } from 'adlens-shared'
import { getPlatformPlacements } from './platform-placements'
import { readSettingsParams, toSettingsSearch, writeSettingsToUrl } from './settings-url'

describe('readSettingsParams', () => {
    it('reads each repeated key into its list', () => {
        expect(
            readSettingsParams(
                `?platform=${Platform.YouTube}&placement=${Placement.YouTubeBumper}&market=${Market.US}&market=${Market.EU}`,
            ),
        ).toEqual({
            platforms: [Platform.YouTube],
            placements: [Placement.YouTubeBumper],
            markets: [Market.US, Market.EU],
        })
    })

    it('drops unknown values and placements whose platform isn’t selected', () => {
        expect(readSettingsParams(`?platform=Myspace&market=Mars&placement=${Placement.MetaFeed}`)).toEqual({
            platforms: [],
            placements: [],
            markets: [],
        })
    })

    it('gives a platform named without placements all of its placements, as picking it does', () => {
        expect(readSettingsParams(`?platform=${Platform.Meta}`).placements).toEqual(
            getPlatformPlacements(Platform.Meta),
        )
    })

    it('reads nothing from an empty address', () => {
        expect(readSettingsParams('')).toEqual({ platforms: [], placements: [], markets: [] })
    })
})

describe('toSettingsSearch', () => {
    it('writes one key per value and keeps the address’s other parameters', () => {
        expect(
            toSettingsSearch('?error=access_denied&platform=TikTok', {
                platforms: [Platform.Meta],
                placements: [Placement.MetaFeed],
                markets: [],
            }),
        ).toBe(`?error=access_denied&platform=${Platform.Meta}&placement=${Placement.MetaFeed}`)
    })

    it('leaves no question mark once nothing is selected', () => {
        expect(toSettingsSearch(`?platform=${Platform.Meta}`, { platforms: [], placements: [], markets: [] })).toBe('')
    })
})

describe('writeSettingsToUrl', () => {
    beforeEach(() => window.history.replaceState(null, '', '/'))

    it('replaces the history entry rather than adding one', () => {
        const historyLength = window.history.length

        writeSettingsToUrl({ platforms: [Platform.Meta], placements: [], markets: [Market.US] })

        expect(window.location.search).toBe(`?platform=${Platform.Meta}&market=${Market.US}`)
        expect(window.history.length).toBe(historyLength)
    })
})
