import type { SocialProvider } from '@/auth/types'
import { withPlatformPlacements } from '@/components/upload/platform-placements'
import { JobStatus, Market, MAX_DURATION_S, Placement, PLACEMENT_PLATFORM, Platform, RulePlatform } from 'adlens-shared'

export const VIDEO_FORMATS_LABEL = 'MP4, M4V, MOV, WebM, 3GP'

// "3 minutes" for whole minutes, "1 minute", or "45 seconds".
export const formatDuration = (seconds: number): string => {
    if (seconds < 60 || seconds % 60 !== 0) {
        return `${seconds} seconds`
    }

    const minutes = seconds / 60

    return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

export const MAX_DURATION_LABEL = formatDuration(MAX_DURATION_S)

export const ATTACHMENT_FORMATS_LABEL = 'PNG, JPEG or WebP'

// An analysis with no platform chosen is checked against every platform's rules.
export const ALL_PLATFORMS_LABEL = 'All platforms'

export const PLATFORM_LABELS: Record<Platform, string> = {
    [Platform.Meta]: 'Meta (Facebook, Instagram)',
    [Platform.TikTok]: 'TikTok',
    // Google Ads policies govern YouTube video ads, so its rules come with this option; its placements name YouTube.
    [Platform.YouTube]: 'Google',
    [Platform.Snapchat]: 'Snapchat',
    [Platform.Pinterest]: 'Pinterest',
    [Platform.LinkedIn]: 'LinkedIn',
    [Platform.Amazon]: 'Amazon Ads',
}

export const RULE_PLATFORM_LABELS: Record<RulePlatform, string> = {
    [RulePlatform.Meta]: 'Meta',
    [RulePlatform.TikTok]: 'TikTok',
    [RulePlatform.YouTube]: 'YouTube',
    [RulePlatform.Snapchat]: 'Snapchat',
    [RulePlatform.Pinterest]: 'Pinterest',
    [RulePlatform.LinkedIn]: 'LinkedIn',
    [RulePlatform.Amazon]: 'Amazon Ads',
    [RulePlatform.Google]: 'Google Ads',
    [RulePlatform.All]: 'All platforms',
}

// Green, red, cyan and purple are left out: History's status, preset and sample tags use them in the same rows. The one
// preset left, yellow, is too pale to read, so LinkedIn shares blue with the in-progress statuses in their own column.
export const PLATFORM_COLORS: Record<Platform, string> = {
    [Platform.Meta]: 'geekblue',
    [Platform.TikTok]: 'magenta',
    [Platform.YouTube]: 'volcano',
    [Platform.Snapchat]: 'gold',
    [Platform.Pinterest]: 'lime',
    [Platform.LinkedIn]: 'blue',
    [Platform.Amazon]: 'orange',
}

// An analysis with no placement chosen is checked against every placement of its platforms.
export const ALL_PLACEMENTS_LABEL = 'All placements'

export const PLACEMENT_LABELS: Record<Placement, string> = {
    [Placement.MetaFeed]: 'Feed',
    [Placement.MetaReels]: 'Reels',
    [Placement.MetaStories]: 'Stories',
    [Placement.TikTokInFeed]: 'In-feed',
    [Placement.YouTubeSkippableInStream]: 'Skippable in-stream',
    [Placement.YouTubeNonSkippableInStream]: 'Non-skippable in-stream',
    [Placement.YouTubeBumper]: 'Bumper (6 s)',
    [Placement.YouTubeShorts]: 'Shorts',
    [Placement.SnapchatSingleVideo]: 'Single video',
    [Placement.PinterestStandardVideo]: 'Standard video',
    [Placement.LinkedInSingleVideo]: 'Single video',
    [Placement.AmazonSponsoredBrandsVideo]: 'Sponsored Brands video',
}

// "YouTube · Bumper": a placement name alone (Feed, In-feed) doesn't say whose it is.
export const formatPlacementLabel = (placement: Placement): string =>
    `${PLACEMENT_PLATFORM[placement]} · ${PLACEMENT_LABELS[placement]}`

export const MARKET_LABELS: Record<Market, string> = {
    [Market.US]: 'United States',
    [Market.UK]: 'United Kingdom',
    [Market.EU]: 'European Union',
    [Market.Other]: 'Other markets',
}

// Mid-sentence ("checked for Meta in all markets"): an analysis with no market chosen is checked for every one.
export const ALL_MARKETS_LABEL = 'all markets'

export const formatMarkets = (markets: Market[]): string =>
    markets.length ? markets.map((market) => MARKET_LABELS[market]).join(', ') : ALL_MARKETS_LABEL

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    [JobStatus.Pending]: 'Not started',
    [JobStatus.Verifying]: 'Checking video',
    [JobStatus.Queued]: 'Starting',
    [JobStatus.Analyzing]: 'Analyzing',
    [JobStatus.Analyzed]: 'Done',
    [JobStatus.Error]: 'Failed',
}

// The in-progress steps are antd's light blue preset, not `processing`: that one follows the teal primary colour, which
// the cyan preset tag in History reads the same as.
export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
    [JobStatus.Pending]: 'default',
    [JobStatus.Verifying]: 'blue',
    [JobStatus.Queued]: 'blue',
    [JobStatus.Analyzing]: 'blue',
    [JobStatus.Analyzed]: 'success',
    [JobStatus.Error]: 'error',
}

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
    google: 'Google',
    github: 'GitHub',
}

export const formatPlatforms = (platforms: Platform[]): string =>
    platforms.length ? platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ') : ALL_PLATFORMS_LABEL

// Meta's option label lists its apps, which its placements in brackets would follow.
const PLATFORM_WITH_PLACEMENTS_LABELS: Record<Platform, string> = { ...PLATFORM_LABELS, [Platform.Meta]: 'Meta' }

// A placement keeps its prefix only where it names something else than the platform: Google (YouTube · Shorts), but
// Amazon Ads (Sponsored Brands video).
const formatPlacementOfPlatform = (placement: Placement, platformLabel: string): string =>
    platformLabel.startsWith(PLACEMENT_PLATFORM[placement])
        ? PLACEMENT_LABELS[placement]
        : formatPlacementLabel(placement)

const formatPlatformWithPlacements = (platform: Platform, placements: Placement[]): string => {
    const label = PLATFORM_WITH_PLACEMENTS_LABELS[platform]
    const placementLabels = placements
        .filter((placement) => PLACEMENT_PLATFORM[placement] === platform)
        .map((placement) => formatPlacementOfPlatform(placement, label))

    return placementLabels.length ? `${label} (${placementLabels.join(', ')})` : label
}

export const formatPlatformsWithPlacements = (platforms: Platform[], placements: Placement[]): string => {
    const allPlacements = withPlatformPlacements(platforms, placements)

    return platforms.length
        ? platforms.map((platform) => formatPlatformWithPlacements(platform, allPlacements)).join(', ')
        : ALL_PLATFORMS_LABEL
}

// Rule topics are ids of the form `category:subject` (`deceptive:fake_ui`); the report shows them as words.
const TOPIC_CATEGORY_LABELS: Record<string, string> = {
    brand: 'Brand',
    claims: 'Claims',
    creative_spec: 'Format',
    deceptive: 'Deceptive',
    disclosure: 'Disclosure',
    editorial: 'Editorial',
    effectiveness: 'Effectiveness',
    general: 'General',
    harm: 'Harm',
    ip: 'Intellectual property',
    prohibited: 'Prohibited',
    restricted: 'Restricted',
}

const TOPIC_ACRONYMS = new Set(['ai', 'cbd', 'ip', 'qr', 'ui'])

const toTopicWords = (id: string): string =>
    id
        .split('_')
        .map((word) => (TOPIC_ACRONYMS.has(word) ? word.toUpperCase() : word))
        .join(' ')

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

// A topic that isn't an id (results stored before topics were ids) is shown as it is.
export const formatTopic = (topic: string): string => {
    const [category, subject] = topic.split(':')

    if (!subject) {
        return capitalize(toTopicWords(topic))
    }

    return `${TOPIC_CATEGORY_LABELS[category] ?? capitalize(toTopicWords(category))}: ${toTopicWords(subject)}`
}
