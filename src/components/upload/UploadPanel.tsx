'use client'

import { NO_CAST_SLOTS, toMediaRatioStyle, toVidstackType } from '@/components/utils/vidstack'
import { VIDEO_FORMATS_LABEL } from '@/labels'
import { DeleteOutlined, InboxOutlined, InfoCircleOutlined, PlaySquareOutlined, SwapOutlined } from '@ant-design/icons'
import { MediaPlayer, MediaProvider } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { MAX_DURATION_S, MAX_UPLOAD_BYTES } from 'adlens-shared'
import { App, Button, Divider, Tag, Tooltip, type TooltipProps, Upload } from 'antd'
import { useTheme } from 'antd-style'
import { DragEvent, SyntheticEvent, useMemo, useState } from 'react'
import { useStyles } from './styles'
import type { AcceptedVideo, SelectedVideo, VideoMetadata } from './types'
import { toVideoMimeType, VIDEO_FILE_ACCEPT } from './video-type'

interface IProps {
    video: SelectedVideo | null
    onSelect: (file: File, video: AcceptedVideo) => void
    onClear: () => void
    onBrowseSamples: () => void
    // Set while an analysis runs: the video and its source can't change under it.
    isDisabled?: boolean
}

const { Dragger } = Upload

const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1000 * 1000)

const REQUIREMENTS_TRIGGER: TooltipProps['trigger'] = ['hover', 'click']

// For the controls inside the Dragger: their clicks and keys must not reach it and open the file dialog.
const stopAtControl = (event: SyntheticEvent) => event.stopPropagation()

// A drop target must cancel dragover, or the browser never fires drop on it.
const allowDrop = (event: DragEvent<HTMLDivElement>) => event.preventDefault()

// Read the video's duration and size by loading only its metadata into a throwaway element. Rejected reads (a file
// the browser can't decode) surface as an error so a doomed upload is stopped client-side.
const readVideoMetadata = (file: File): Promise<VideoMetadata> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url)
            resolve({ durationS: video.duration, width: video.videoWidth, height: video.videoHeight })
        }
        video.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Could not read video metadata'))
        }
        video.src = url
    })

export function UploadPanel({ video, onSelect, onClear, onBrowseSamples, isDisabled = false }: IProps) {
    const theme = useTheme()
    const { styles, cx } = useStyles()
    const { notification } = App.useApp()
    const [isDragging, setIsDragging] = useState(false)

    // Stable Vidstack source (memoised — Vidstack watches `src` by identity) with an explicit, recognised
    // MIME type so a blob object URL actually loads instead of spinning.
    const playerSrc = useMemo(() => (video ? { src: video.url, type: toVidstackType(video.type) } : ''), [video])

    // Client-side gate only — the server's ffprobe check is the real boundary; this just avoids a doomed upload.
    const verifyFile = async (file: File): Promise<AcceptedVideo | null> => {
        const contentType = toVideoMimeType(file.type)

        if (!contentType) {
            notification.error({
                title: `Please upload a video in one of these formats: ${VIDEO_FORMATS_LABEL}.`,
                placement: 'bottomRight',
            })
            return null
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            notification.error({ title: `Video must be under ${MAX_UPLOAD_MB} MB.`, placement: 'bottomRight' })
            return null
        }

        let metadata: VideoMetadata

        try {
            metadata = await readVideoMetadata(file)
        } catch {
            notification.error({
                title: 'Could not read the video. Please try a different file.',
                placement: 'bottomRight',
            })
            return null
        }

        if (metadata.durationS > MAX_DURATION_S) {
            notification.error({
                title: `Video must be ${MAX_DURATION_S} seconds or shorter.`,
                placement: 'bottomRight',
            })
            return null
        }

        return { ...metadata, contentType }
    }

    const selectIfAccepted = async (file: File) => {
        const accepted = await verifyFile(file)

        if (accepted) {
            onSelect(file, accepted)
        }
    }

    const handleDragEnter = () => setIsDragging(!isDisabled)
    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false)
        }
    }
    // antd's Dragger owns the empty state, so the video state gets its own drop handler.
    const handleDropReplace = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files?.[0]

        if (!file || isDisabled) {
            return
        }

        await selectIfAccepted(file)
    }

    const requirements = (
        <div className="d-flex flex-column gap-1">
            <div>
                <span className={styles.reqKey}>Formats:</span> {VIDEO_FORMATS_LABEL}
            </div>
            <div>
                <span className={styles.reqKey}>Size:</span> up to {MAX_UPLOAD_MB} MB
            </div>
            <div>
                <span className={styles.reqKey}>Length:</span> up to {MAX_DURATION_S} seconds
            </div>
        </div>
    )

    if (video) {
        return (
            <div
                className={styles.frame}
                style={toMediaRatioStyle(video.width, video.height)}
                data-video="true"
                data-dragging={isDragging}
                onDragEnter={handleDragEnter}
                onDragOver={allowDrop}
                onDragLeave={handleDragLeave}
                onDrop={handleDropReplace}
            >
                <MediaPlayer
                    className={styles.player}
                    src={playerSrc}
                    viewType="video"
                    load="eager"
                    playsInline
                    aria-label={video.sampleTitle ? `Sample ad: ${video.sampleTitle}` : 'Uploaded video ad'}
                >
                    <MediaProvider />
                    {/* Force the large layout so every control lives in the bottom bar, leaving the
                        top-right corner free for the Replace/Remove overlay. Cast/AirPlay are removed —
                        they can't target a local blob URL anyway. */}
                    <DefaultVideoLayout icons={defaultLayoutIcons} smallLayoutWhen={false} slots={NO_CAST_SLOTS} />
                </MediaPlayer>
                {video.sampleTitle && (
                    <div className={styles.sampleBadge}>
                        <Tag color="processing">Sample ad · {video.sampleTitle}</Tag>
                    </div>
                )}
                <div data-overlay className={styles.overlay}>
                    <Upload
                        accept={VIDEO_FILE_ACCEPT}
                        maxCount={1}
                        showUploadList={false}
                        disabled={isDisabled}
                        beforeUpload={async (incoming) => {
                            await selectIfAccepted(incoming)
                            return false
                        }}
                    >
                        <Button
                            shape="circle"
                            icon={<SwapOutlined />}
                            aria-label="Replace video"
                            title="Replace"
                            disabled={isDisabled}
                        />
                    </Upload>
                    <Button
                        shape="circle"
                        icon={<DeleteOutlined />}
                        aria-label="Remove video"
                        title="Remove"
                        onClick={onClear}
                        disabled={isDisabled}
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
            onDragOver={allowDrop}
            onDragLeave={handleDragLeave}
            onDrop={() => setIsDragging(false)}
        >
            <Dragger
                className={styles.dragger}
                accept={VIDEO_FILE_ACCEPT}
                maxCount={1}
                showUploadList={false}
                disabled={isDisabled}
                beforeUpload={async (incoming) => {
                    await selectIfAccepted(incoming)
                    return false
                }}
            >
                <p className={styles.icon} data-icon>
                    <InboxOutlined />
                </p>
                <p className={styles.title}>
                    <span className={styles.pointerOnly}>Drop your video ad here</span>
                    <span className={styles.touchOnly}>Tap to upload your video ad</span>
                </p>
                <p className={cx(styles.hint, styles.pointerOnly)}>Click or drag to upload</p>
                <Tooltip placement="bottom" title={requirements} trigger={REQUIREMENTS_TRIGGER}>
                    <Button
                        size="small"
                        icon={<InfoCircleOutlined />}
                        className={styles.reqButton}
                        aria-label={`Requirements: ${VIDEO_FORMATS_LABEL} · up to ${MAX_UPLOAD_MB} MB · up to ${MAX_DURATION_S} seconds`}
                        onClick={stopAtControl}
                        onKeyDown={stopAtControl}
                    >
                        Requirements
                    </Button>
                </Tooltip>
                <div className={styles.samplesPrompt} onClick={stopAtControl} onKeyDown={stopAtControl}>
                    <Divider
                        plain
                        className={styles.samplesDivider}
                        styles={{ rail: { borderColor: theme.colorBorder } }}
                    >
                        or
                    </Divider>
                    <span>No ad at hand?</span>
                    <Button size="small" icon={<PlaySquareOutlined />} onClick={onBrowseSamples} disabled={isDisabled}>
                        Try a sample ad
                    </Button>
                </div>
            </Dragger>
        </div>
    )
}
