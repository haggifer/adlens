import type { AnalysisSettingsInput, Sample } from 'adlens-shared'
import { withPlatformPlacements } from './platform-placements'

// A sample brings the settings it was published with. It names its platforms only, and each brings all of its
// placements.
export const getSampleSettings = ({ settings }: Sample): AnalysisSettingsInput => ({
    ...settings,
    placements: withPlatformPlacements(settings.platforms, settings.placements),
})
