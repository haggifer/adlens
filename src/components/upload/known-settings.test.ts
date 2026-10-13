import { Market, Placement, Platform } from 'adlens-shared'
import { toKnownSettings } from './known-settings'
import { getPlatformPlacements } from './platform-placements'

describe('toKnownSettings', () => {
    it('drops values that no longer exist, as a preset saved under an older ruleset may hold', () => {
        expect(
            toKnownSettings({
                platforms: [Platform.Meta, 'Myspace'],
                placements: [Placement.MetaFeed, 'MyspaceTop'],
                markets: [Market.US, 'Mars'],
            }),
        ).toEqual({ platforms: [Platform.Meta], placements: [Placement.MetaFeed], markets: [Market.US] })
    })

    it('drops placements whose platform isn’t selected', () => {
        expect(toKnownSettings({ placements: [Placement.MetaFeed] })).toEqual({
            platforms: [],
            placements: [],
            markets: [],
        })
    })

    it('gives a platform named without placements all of its placements, as picking it does', () => {
        expect(toKnownSettings({ platforms: [Platform.Meta] }).placements).toEqual(getPlatformPlacements(Platform.Meta))
    })

    it('links platforms and placements the way the fields do', () => {
        expect(toKnownSettings({ platforms: [Platform.Meta], placements: [Placement.YouTubeBumper] })).toEqual({
            platforms: [Platform.Meta],
            placements: getPlatformPlacements(Platform.Meta),
            markets: [],
        })
    })
})
