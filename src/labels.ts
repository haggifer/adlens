import type { SocialProvider } from '@/auth/types'
import { JobStatus, Market, Placement, PLACEMENT_PLATFORM, Platform, RulePlatform } from 'adlens-shared'

export const VIDEO_FORMATS_LABEL = 'MP4, M4V, MOV, WebM, 3GP'

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

const PLACEMENT_LABELS: Record<Placement, string> = {
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

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    [JobStatus.Pending]: 'Not started',
    [JobStatus.Verifying]: 'Checking video',
    [JobStatus.Queued]: 'Starting',
    [JobStatus.Analyzing]: 'Analyzing',
    [JobStatus.Analyzed]: 'Done',
    [JobStatus.Error]: 'Failed',
}

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
    [JobStatus.Pending]: 'default',
    [JobStatus.Verifying]: 'processing',
    [JobStatus.Queued]: 'processing',
    [JobStatus.Analyzing]: 'processing',
    [JobStatus.Analyzed]: 'success',
    [JobStatus.Error]: 'error',
}

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
    google: 'Google',
    github: 'GitHub',
}

export const formatPlatforms = (platforms: Platform[]): string =>
    platforms.length ? platforms.map((platform) => PLATFORM_LABELS[platform]).join(', ') : ALL_PLATFORMS_LABEL

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
