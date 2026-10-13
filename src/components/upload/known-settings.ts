import { type AnalysisSettingsInput, Market, Placement, PLACEMENT_PLATFORM, Platform } from 'adlens-shared'
import { withPlatformPlacements } from './platform-placements'

type SettingsField = keyof AnalysisSettingsInput

// Settings from outside the form, each value as a plain string: what a stored preset holds.
type LooseSettings = Partial<Record<SettingsField, readonly string[]>>

const PLATFORMS = Object.values(Platform)
const PLACEMENTS = Object.values(Placement)
const MARKETS = Object.values(Market)

const pickKnown = <T extends string>(values: readonly string[] = [], allowed: T[]): T[] => {
    const given = new Set(values)

    return allowed.filter((value) => given.has(value))
}

// A preset saved under an older ruleset may name values that no longer exist or a placement without its platform;
// those drop, and a platform named alone brings its placements, as picking it does.
export const toKnownSettings = (settings: LooseSettings): AnalysisSettingsInput => {
    const platforms = pickKnown(settings.platforms, PLATFORMS)
    const placements = pickKnown(settings.placements, PLACEMENTS).filter((placement) =>
        platforms.includes(PLACEMENT_PLATFORM[placement]),
    )

    return {
        platforms,
        placements: withPlatformPlacements(platforms, placements),
        markets: pickKnown(settings.markets, MARKETS),
    }
}
