import { type AnalysisSettingsInput, Market, Placement, Platform } from 'adlens-shared'
import { isSameSettings } from './same-settings'

const SETTINGS: AnalysisSettingsInput = {
    platforms: [Platform.Meta, Platform.TikTok],
    placements: [Placement.MetaFeed, Placement.TikTokInFeed],
    markets: [Market.US, Market.EU],
}

const EMPTY: AnalysisSettingsInput = { platforms: [], placements: [], markets: [] }

describe('isSameSettings', () => {
    it('treats the same values in another order as the same settings', () => {
        const reordered: AnalysisSettingsInput = {
            platforms: [Platform.TikTok, Platform.Meta],
            placements: [Placement.TikTokInFeed, Placement.MetaFeed],
            markets: [Market.EU, Market.US],
        }

        expect(isSameSettings(SETTINGS, reordered)).toBe(true)
    })

    it.each([
        ['platforms', { platforms: [Platform.Meta] }],
        ['placements', { placements: [Placement.MetaFeed, Placement.MetaReels] }],
        ['markets', { markets: [Market.US, Market.UK] }],
    ])('tells settings apart when %s differ', (_, change) => {
        expect(isSameSettings(SETTINGS, { ...SETTINGS, ...change })).toBe(false)
        expect(isSameSettings({ ...SETTINGS, ...change }, SETTINGS)).toBe(false)
    })

    it('treats a missing field as an empty one', () => {
        expect(isSameSettings({}, EMPTY)).toBe(true)
        expect(isSameSettings(EMPTY, { platforms: [] })).toBe(true)
        expect(isSameSettings({ markets: SETTINGS.markets }, SETTINGS)).toBe(false)
    })
})
