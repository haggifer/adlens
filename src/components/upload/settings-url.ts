import { type AnalysisSettingsInput, Market, Placement, PLACEMENT_PLATFORM, Platform } from 'adlens-shared'
import { withPlatformPlacements } from './platform-placements'

type SettingsField = keyof AnalysisSettingsInput

// Settings from outside the form, each value as a plain string: what an address or a stored preset holds.
type LooseSettings = Partial<Record<SettingsField, readonly string[]>>

// One repeated key per value (?platform=YouTube&platform=Meta): the values need no encoding, so a link reads plainly.
const PARAM_KEYS: Record<SettingsField, string> = {
    platforms: 'platform',
    placements: 'placement',
    markets: 'market',
}

const FIELDS = Object.keys(PARAM_KEYS) as SettingsField[]

const PLATFORMS = Object.values(Platform)
const PLACEMENTS = Object.values(Placement)
const MARKETS = Object.values(Market)

const pickKnown = <T extends string>(values: readonly string[] = [], allowed: T[]): T[] => {
    const given = new Set(values)

    return allowed.filter((value) => given.has(value))
}

// A hand-edited or outdated link, or a preset saved under an older ruleset, may name values that no longer exist or a
// placement without its platform; those drop, and a platform named alone brings its placements, as picking it does.
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

export const readSettingsParams = (search: string): AnalysisSettingsInput => {
    const params = new URLSearchParams(search)

    return toKnownSettings({
        platforms: params.getAll(PARAM_KEYS.platforms),
        placements: params.getAll(PARAM_KEYS.placements),
        markets: params.getAll(PARAM_KEYS.markets),
    })
}

// Keeps the address's other parameters (a sign-in error, say) as they are.
export const toSettingsSearch = (search: string, settings: Partial<AnalysisSettingsInput>): string => {
    const params = new URLSearchParams(search)

    FIELDS.forEach((field) => {
        params.delete(PARAM_KEYS[field])
        settings[field]?.forEach((value) => params.append(PARAM_KEYS[field], value))
    })

    const query = params.toString()

    return query ? `?${query}` : ''
}

// Replaces the history entry instead of adding one, so Back still leaves the page rather than undoing a setting.
export const writeSettingsToUrl = (settings: Partial<AnalysisSettingsInput>): void => {
    const { pathname, search, hash } = window.location
    const nextSearch = toSettingsSearch(search, settings)

    if (nextSearch !== search) {
        window.history.replaceState(null, '', `${pathname}${nextSearch}${hash}`)
    }
}
