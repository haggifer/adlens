import { ALL_PLATFORMS_LABEL, formatPlatforms, formatTopic } from '@/labels'
import { Platform } from 'adlens-shared'

describe('formatPlatforms', () => {
    it('lists the chosen platforms', () => {
        expect(formatPlatforms([Platform.TikTok, Platform.Snapchat])).toBe('TikTok, Snapchat')
    })

    it('names every platform when none was chosen', () => {
        expect(formatPlatforms([])).toBe(ALL_PLATFORMS_LABEL)
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
