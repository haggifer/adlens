import { Placement, PLACEMENT_PLATFORM, Platform } from 'adlens-shared'
import {
    getPlatformPlacements,
    toPlacementsForPlatforms,
    toPlatformsForPlacements,
    withPlatformPlacements,
} from './platform-placements'

const META_PLACEMENTS = getPlatformPlacements(Platform.Meta)

describe('platform placements', () => {
    it('lists every placement once, under its own platform', () => {
        const listed = Object.values(Platform).flatMap((platform) =>
            getPlatformPlacements(platform).map((placement) => ({ placement, platform })),
        )

        expect(listed.map(({ placement }) => placement).sort()).toEqual(Object.values(Placement).sort())
        listed.forEach(({ placement, platform }) => expect(PLACEMENT_PLATFORM[placement]).toBe(platform))
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
