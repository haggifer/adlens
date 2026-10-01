import { JobStatus, Market, Placement, Platform, RulePlatform } from 'adlens-shared'
import type { SocialProvider } from '@/auth/types'

export const VIDEO_FORMATS_LABEL = 'MP4, M4V, MOV, WebM, 3GP'

export const ATTACHMENT_FORMATS_LABEL = 'PNG, JPEG or WebP'

// An analysis with no platform chosen is checked against every platform's rules.
export const ALL_PLATFORMS_LABEL = 'All platforms'

export const PLATFORM_LABELS: Record<Platform, string> = {
    [Platform.Meta]: 'Meta (Facebook, Instagram)',
    [Platform.TikTok]: 'TikTok',
    // Google Ads policies govern YouTube video ads, so its rules come with this option.
    [Platform.YouTube]: 'YouTube (Google Ads)',
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

export const MARKET_LABELS: Record<Market, string> = {
    [Market.US]: 'United States',
    [Market.UK]: 'United Kingdom',
    [Market.EU]: 'European Union',
    [Market.Other]: 'Other markets',
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    [JobStatus.Pending]: 'Not started',
    [JobStatus.Verifying]: 'Checking video',
    [JobStatus.Queued]: 'Queued',
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
