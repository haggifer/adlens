import {
    ALL_MARKETS_LABEL,
    ALL_PLATFORMS_LABEL,
    formatDuration,
    formatMarkets,
    formatPlatforms,
    formatTopic,
    MARKET_LABELS,
    PLATFORM_LABELS,
} from '@/labels'
import { Market, Platform } from 'adlens-shared'

describe('formatPlatforms', () => {
    it('lists the chosen platforms', () => {
        expect(formatPlatforms([Platform.TikTok, Platform.Snapchat])).toBe(
            `${PLATFORM_LABELS[Platform.TikTok]}, ${PLATFORM_LABELS[Platform.Snapchat]}`,
        )
    })

    it('names every platform when none was chosen', () => {
        expect(formatPlatforms([])).toBe(ALL_PLATFORMS_LABEL)
    })
})

describe('formatMarkets', () => {
    it('lists the chosen markets', () => {
        expect(formatMarkets([Market.US, Market.UK])).toBe(`${MARKET_LABELS[Market.US]}, ${MARKET_LABELS[Market.UK]}`)
    })

    it('names every market when none was chosen', () => {
        expect(formatMarkets([])).toBe(ALL_MARKETS_LABEL)
    })
})

describe('formatTopic', () => {
    it('reads a rule topic id as words, with its category first', () => {
        expect(formatTopic('prohibited:contact_info')).toBe('Prohibited: contact info')
        expect(formatTopic('creative_spec:aspect_ratio')).toBe('Format: aspect ratio')
        expect(formatTopic('ip:copyright')).toBe('Intellectual property: copyright')
    })

    it('keeps acronyms in capitals', () => {
        expect(formatTopic('deceptive:fake_ui')).toBe('Deceptive: fake UI')
        expect(formatTopic('disclosure:ai_generated')).toBe('Disclosure: AI generated')
    })

    it('spells out a category it doesn’t know', () => {
        expect(formatTopic('new_kind:thing')).toBe('New kind: thing')
    })

    it('shows a topic stored before topics were ids as it is', () => {
        expect(formatTopic('Bumper duration')).toBe('Bumper duration')
    })
})

describe('formatDuration', () => {
    it('writes whole minutes as minutes, and anything else in seconds', () => {
        expect(formatDuration(180)).toBe('3 minutes')
        expect(formatDuration(60)).toBe('1 minute')
        expect(formatDuration(45)).toBe('45 seconds')
        expect(formatDuration(90)).toBe('90 seconds')
    })
})
