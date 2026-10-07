'use client'

import { MediaPlayer, type MediaPlayerInstance, MediaProvider } from '@vidstack/react'
import {
    defaultLayoutIcons,
    DefaultVideoLayout,
    type DefaultVideoLayoutSlots,
} from '@vidstack/react/player/layouts/default'
// Vidstack's layout stylesheet overrides its theme at equal specificity, so the theme must load first. Both load with
// this module, which pages fetch only once there is a video to show (see LazyVideoPlayer).
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { type RefObject, useMemo } from 'react'

// The MIME types Vidstack recognises as video. Neither a blob: object URL nor a signed GCS URL has a file extension,
// so Vidstack relies entirely on this type to pick the native video provider — anything it doesn't list is never
// loaded and the player spins forever. So map other types onto a recognised one (the browser still sniffs the real
// codec when the <source> is attached).
const VIDSTACK_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/3gp', 'video/ogg', 'video/avi', 'video/mpeg'] as const

type VidstackVideoType = (typeof VIDSTACK_VIDEO_TYPES)[number]

// Cast and AirPlay can't target a local blob URL, and a signed URL expires: neither is offered.
const NO_CAST_SLOTS: DefaultVideoLayoutSlots = { googleCastButton: null, airPlayButton: null }

const toVidstackType = (mime: string): VidstackVideoType =>
    (VIDSTACK_VIDEO_TYPES as readonly string[]).includes(mime) ? (mime as VidstackVideoType) : 'video/mp4'

interface IProps {
    url: string
    contentType: string
    ariaLabel: string
    className?: string
    // Loads the video at once rather than when the player scrolls into view.
    isEager?: boolean
    // The player instance, for seeking from outside.
    playerRef?: RefObject<MediaPlayerInstance | null>
}

export function VideoPlayer({ url, contentType, ariaLabel, className, isEager, playerRef }: IProps) {
    // Stable source: Vidstack watches `src` by identity.
    const src = useMemo(() => ({ src: url, type: toVidstackType(contentType) }), [url, contentType])

    return (
        <MediaPlayer
            ref={playerRef}
            className={className}
            src={src}
            viewType="video"
            load={isEager ? 'eager' : undefined}
            playsInline
            aria-label={ariaLabel}
        >
            <MediaProvider />
            {/* The large layout keeps every control in the bottom bar, leaving the top-right corner free for overlays
                such as the upload panel's Replace and Remove buttons. */}
            <DefaultVideoLayout icons={defaultLayoutIcons} smallLayoutWhen={false} slots={NO_CAST_SLOTS} />
        </MediaPlayer>
    )
}
