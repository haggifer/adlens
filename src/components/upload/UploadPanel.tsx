'use client'

import { DragEvent, useMemo, useState } from 'react'
import { DeleteOutlined, InboxOutlined, InfoCircleOutlined, SwapOutlined } from '@ant-design/icons'
import { App, Button, Tag, Tooltip, Upload } from 'antd'
import { useTheme } from 'antd-style'
import { MediaPlayer, MediaProvider } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import { useStyles } from './styles'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

export interface SelectedVideo {
    url: string
    type: string
}

interface IProps {
    video: SelectedVideo | null
    onSelect: (file: File) => void
    onClear: () => void
}

const { Dragger } = Upload

// The MIME types Vidstack recognises as video. An object URL (blob:) has no extension, so Vidstack relies
// entirely on this type to pick the native video provider — anything it doesn't list is never loaded and
// the player spins forever. So map unknown/empty types onto a recognised one (the browser still sniffs the
// real codec from the blob when the <source> is attached).
const VIDSTACK_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/3gp', 'video/ogg', 'video/avi', 'video/mpeg'] as const
type VidstackVideoType = (typeof VIDSTACK_VIDEO_TYPES)[number]

const toVidstackType = (mime: string): VidstackVideoType =>
    (VIDSTACK_VIDEO_TYPES as readonly string[]).includes(mime) ? (mime as VidstackVideoType) : 'video/mp4'

const MAX_UPLOAD_MB = 200
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1000 * 1000

export default function UploadPanel({ video, onSelect, onClear }: IProps) {
    const theme = useTheme()
    const { styles } = useStyles()
    const { message } = App.useApp()
    const [isDragging, setIsDragging] = useState(false)

    // Stable Vidstack source (memoised — Vidstack watches `src` by identity) with an explicit, recognised
    // MIME type so a blob object URL actually loads instead of spinning.
    const playerSrc = useMemo(() => (video ? { src: video.url, type: toVidstackType(video.type) } : ''), [video])

    // Client-side gate only — the Storage rule is the real boundary; this just avoids a doomed upload.
    const acceptFile = (file: File) => {
        if (!file.type.startsWith('video/')) {
            message.error('Please upload a video file.')
            return false
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            message.error(`Video must be under ${MAX_UPLOAD_MB} MB.`)
            return false
        }

        return true
    }

    const handleDragEnter = () => setIsDragging(true)
    const handleDragOver = (event: DragEvent<HTMLDivElement>) => event.preventDefault()
    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false)
        }
    }
    // antd's Dragger owns the empty state, so the video state gets its own drop handler.
    const handleDropReplace = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file && acceptFile(file)) {
            onSelect(file)
        }
    }

    const requirements = (
        <div className="d-flex flex-column gap-1">
            <div>
                <span className={styles.reqKey}>Formats:</span> MP4, MOV, WEBM, AVI, FLV, MPEG, WMV, 3GPP
            </div>
            <div>
                <span className={styles.reqKey}>Size:</span> up to {MAX_UPLOAD_MB} MB
            </div>
        </div>
    )

    if (video) {
        return (
            <div
                className={styles.frame}
                data-video="true"
                data-dragging={isDragging}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropReplace}
            >
                <MediaPlayer
                    className={styles.player}
                    src={playerSrc}
                    viewType="video"
                    load="eager"
                    playsInline
                    aria-label="Uploaded video ad"
                >
                    <MediaProvider />
                    {/* Force the large layout so every control lives in the bottom bar, leaving the
                        top-right corner free for the Replace/Remove overlay. Cast/AirPlay are removed —
                        they can't target a local blob URL anyway. */}
                    <DefaultVideoLayout
                        icons={defaultLayoutIcons}
                        smallLayoutWhen={false}
                        slots={{ googleCastButton: null, airPlayButton: null }}
                    />
                </MediaPlayer>
                <div data-overlay className={styles.overlay}>
                    <Upload
                        accept="video/*"
                        maxCount={1}
                        showUploadList={false}
                        beforeUpload={(incoming) => {
                            if (acceptFile(incoming)) {
                                onSelect(incoming)
                            }
                            return false
                        }}
                    >
                        <Button shape="circle" icon={<SwapOutlined />} aria-label="Replace video" title="Replace" />
                    </Upload>
                    <Button
                        shape="circle"
                        icon={<DeleteOutlined />}
                        aria-label="Remove video"
                        title="Remove"
                        onClick={onClear}
                    />
                </div>
            </div>
        )
    }

    return (
        <div
            className={styles.frame}
            data-dragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={() => setIsDragging(false)}
        >
            <Dragger
                className={styles.dragger}
                accept="video/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(incoming) => {
                    if (acceptFile(incoming)) {
                        onSelect(incoming)
                    }
                    return false
                }}
            >
                <p className={styles.icon} data-icon>
                    <InboxOutlined />
                </p>
                <p className={styles.title}>Drop your video ad here</p>
                <p className={styles.hint}>Click or drag to upload</p>
                <Tooltip placement="bottom" title={requirements}>
                    <Tag
                        variant="outlined"
                        icon={<InfoCircleOutlined />}
                        className={styles.reqTag}
                        color={theme.colorTextTertiary}
                        aria-label={`Accepted files: MP4, MOV, WEBM, AVI, FLV, MPEG, WMV, 3GPP · up to ${MAX_UPLOAD_MB} MB`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        Requirements
                    </Tag>
                </Tooltip>
            </Dragger>
        </div>
    )
}
