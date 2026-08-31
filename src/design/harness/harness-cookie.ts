import { AmbientId, DEFAULT_AMBIENT_ID } from '@/design/backgrounds'
import { DEFAULT_RUN_ACCENT, RunAccentId } from '@/design/run-accents'
import { PRIMARY_COLOR } from '@/design/theme'

// TEMPORARY — design harness only. Persists the exploration knobs (ambient backdrop + primary override +
// Run-button accent) so they survive a reload, and are SSR-seeded to avoid a flash. Delete this file when
// finalizing.
export const HARNESS_COOKIE = 'adlens_harness'

export interface HarnessSettings {
    primaryColor: string
    ambientId: AmbientId
    runAccent: RunAccentId
}

export const DEFAULT_HARNESS_SETTINGS: HarnessSettings = {
    primaryColor: PRIMARY_COLOR,
    ambientId: DEFAULT_AMBIENT_ID,
    runAccent: DEFAULT_RUN_ACCENT,
}

const isAmbientId = (value: unknown): value is AmbientId => Object.values(AmbientId).includes(value as AmbientId)
const isRunAccentId = (value: unknown): value is RunAccentId =>
    Object.values(RunAccentId).includes(value as RunAccentId)

export const parseHarness = (raw?: string): HarnessSettings => {
    if (!raw) {
        return DEFAULT_HARNESS_SETTINGS
    }

    try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<HarnessSettings>

        return {
            primaryColor: typeof parsed.primaryColor === 'string' ? parsed.primaryColor : PRIMARY_COLOR,
            ambientId: isAmbientId(parsed.ambientId) ? parsed.ambientId : DEFAULT_AMBIENT_ID,
            runAccent: isRunAccentId(parsed.runAccent) ? parsed.runAccent : DEFAULT_RUN_ACCENT,
        }
    } catch {
        return DEFAULT_HARNESS_SETTINGS
    }
}

export const writeHarness = (settings: HarnessSettings) => {
    const value = encodeURIComponent(JSON.stringify(settings))
    document.cookie = `${HARNESS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
}
