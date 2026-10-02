import { ALL_PLATFORMS_LABEL, formatPlatforms } from '@/labels'
import { Platform } from 'adlens-shared'

describe('formatPlatforms', () => {
    it('lists the chosen platforms', () => {
        expect(formatPlatforms([Platform.TikTok, Platform.Snapchat])).toBe('TikTok, Snapchat')
    })

    it('names every platform when none was chosen', () => {
        expect(formatPlatforms([])).toBe(ALL_PLATFORMS_LABEL)
    })
})
