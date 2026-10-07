import { type AnalysisSettingsInput, Market, Placement, PLACEMENT_PLATFORM, Platform } from 'adlens-shared'
import { withPlatformPlacements } from './platform-placements'

type SettingsField = keyof AnalysisSettingsInput

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

const readValues = <T extends string>(params: URLSearchParams, key: string, allowed: T[]): T[] => {
    const values = new Set(params.getAll(key))

    return allowed.filter((value) => values.has(value))
}

// A hand-edited or outdated link may name values that no longer exist or a placement without its platform; those
// drop, and a platform named alone brings its placements, as picking it does.
export const readSettingsParams = (search: string): AnalysisSettingsInput => {
    const params = new URLSearchParams(search)

    const platforms = readValues(params, PARAM_KEYS.platforms, PLATFORMS)
    const placements = readValues(params, PARAM_KEYS.placements, PLACEMENTS).filter((placement) =>
        platforms.includes(PLACEMENT_PLATFORM[placement]),
    )

    return {
        platforms,
        placements: withPlatformPlacements(platforms, placements),
        markets: readValues(params, PARAM_KEYS.markets, MARKETS),
    }
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
