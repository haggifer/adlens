import { VideoMimeType } from 'adlens-shared'
import { toVideoMimeType, VIDEO_FILE_ACCEPT } from './video-type'

describe('toVideoMimeType', () => {
    it('keeps a type Gemini accepts as it is', () => {
        expect(toVideoMimeType('video/quicktime')).toBe(VideoMimeType.QuickTime)
    })

    it('declares an .m4v file as MP4', () => {
        expect(toVideoMimeType('video/x-m4v')).toBe(VideoMimeType.Mp4)
    })

    it('rejects types Gemini can’t read or browsers can’t play, and an unknown type', () => {
        expect(toVideoMimeType('video/x-matroska')).toBeNull()
        expect(toVideoMimeType('video/mpeg')).toBeNull()
        expect(toVideoMimeType('video/x-flv')).toBeNull()
        expect(toVideoMimeType('')).toBeNull()
    })

    it('lets the file picker offer .m4v files', () => {
        expect(VIDEO_FILE_ACCEPT.split(',')).toEqual(expect.arrayContaining(['video/x-m4v', '.m4v']))
    })
})
