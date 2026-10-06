import { Placement, Platform } from 'adlens-shared'
import {
    getPlatformPlacements,
    toPlacementsForPlatforms,
    toPlatformsForPlacements,
    withPlatformPlacements,
} from './platform-placements'

const META_PLACEMENTS = [Placement.MetaFeed, Placement.MetaReels, Placement.MetaStories]

describe('platform placements', () => {
    it('lists each platform’s placements', () => {
        expect(getPlatformPlacements(Platform.Meta)).toEqual(META_PLACEMENTS)
        expect(getPlatformPlacements(Platform.TikTok)).toEqual([Placement.TikTokInFeed])
    })

    it('selects every placement of a newly selected platform and keeps the others as they were', () => {
        expect(
            toPlacementsForPlatforms([Placement.TikTokInFeed], [Platform.TikTok], [Platform.TikTok, Platform.Meta]),
        ).toEqual([Placement.TikTokInFeed, ...META_PLACEMENTS])
    })

    it('drops the placements of a deselected platform', () => {
        expect(
            toPlacementsForPlatforms(
                [...META_PLACEMENTS, Placement.TikTokInFeed],
                [Platform.Meta, Platform.TikTok],
                [Platform.TikTok],
            ),
        ).toEqual([Placement.TikTokInFeed])
    })

    it('keeps a platform while any of its placements is selected, and drops it with the last one', () => {
        const platforms = [Platform.Meta, Platform.TikTok]

        expect(toPlatformsForPlacements(platforms, [Placement.MetaReels, Placement.TikTokInFeed])).toEqual(platforms)
        expect(toPlatformsForPlacements(platforms, [Placement.TikTokInFeed])).toEqual([Platform.TikTok])
    })

    it('gives a saved platform without placements all of them', () => {
        expect(withPlatformPlacements([Platform.Meta, Platform.TikTok], [Placement.TikTokInFeed])).toEqual([
            Placement.TikTokInFeed,
            ...META_PLACEMENTS,
        ])
    })
})
