import { Placement, PLACEMENT_PLATFORM, Platform } from 'adlens-shared'

const PLACEMENTS_BY_PLATFORM = Object.fromEntries(
    Object.values(Platform).map((platform) => [
        platform,
        Object.values(Placement).filter((placement) => PLACEMENT_PLATFORM[placement] === platform),
    ]),
) as Record<Platform, Placement[]>

const hasPlacementOf = (placements: Placement[], platform: Platform) =>
    placements.some((placement) => PLACEMENT_PLATFORM[placement] === platform)

export const getPlatformPlacements = (platform: Platform): Placement[] => PLACEMENTS_BY_PLATFORM[platform]

// Platforms and placements select each other: a newly selected platform brings all of its placements, and a
// deselected one takes them with it.
export const toPlacementsForPlatforms = (
    placements: Placement[],
    previousPlatforms: Platform[],
    platforms: Platform[],
): Placement[] => [
    ...placements.filter((placement) => platforms.includes(PLACEMENT_PLATFORM[placement])),
    ...platforms.filter((platform) => !previousPlatforms.includes(platform)).flatMap(getPlatformPlacements),
]

// The other direction: a platform stays selected while any of its placements is.
export const toPlatformsForPlacements = (platforms: Platform[], placements: Placement[]): Platform[] =>
    platforms.filter((platform) => !getPlatformPlacements(platform).length || hasPlacementOf(placements, platform))

// Settings saved before the two were linked (a sample's) can name a platform with none of its placements.
export const withPlatformPlacements = (platforms: Platform[], placements: Placement[]): Placement[] => [
    ...placements,
    ...platforms.filter((platform) => !hasPlacementOf(placements, platform)).flatMap(getPlatformPlacements),
]
