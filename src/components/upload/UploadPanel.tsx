'use client'

import { DeleteOutlined, InboxOutlined, InfoCircleOutlined, SwapOutlined } from '@ant-design/icons'
import { MediaPlayer, MediaProvider } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import { MAX_DURATION_S, MAX_UPLOAD_BYTES, VideoMimeType } from 'adlens-shared'
import { App, Button, Tag, Tooltip, Upload } from 'antd'
import { DragEvent, useMemo, useState } from 'react'
import { toVidstackType } from '@/components/utils/vidstack'
import { VIDEO_FORMATS_LABEL } from '@/labels'
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

const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1000 * 1000)

const VIDEO_MIME_TYPES = Object.values(VideoMimeType) as string[]

const ACCEPT = [...VIDEO_MIME_TYPES, '.mp4', '.mov', '.webm', '.mpeg', '.mpg', '.3gp', '.flv'].join(',')

// Read the video's duration by loading only its metadata into a throwaway element. Rejected reads (a file
// the browser can't decode) surface as an error so a doomed upload is stopped client-side.
const getVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url)
            resolve(video.duration)
        }
        video.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Could not read video metadata'))
        }
        video.src = url
    })

export default function UploadPanel({ video, onSelect, onClear }: IProps) {
    const { styles } = useStyles()
    const { notification } = App.useApp()
    const [isDragging, setIsDragging] = useState(false)

    // Stable Vidstack source (memoised — Vidstack watches `src` by identity) with an explicit, recognised
    // MIME type so a blob object URL actually loads instead of spinning.
    const playerSrc = useMemo(() => (video ? { src: video.url, type: toVidstackType(video.type) } : ''), [video])

    // Client-side gate only — the server's ffprobe check is the real boundary; this just avoids a doomed upload.
    const acceptFile = async (file: File) => {
        if (!VIDEO_MIME_TYPES.includes(file.type)) {
            notification.error({
                message: `Please upload a video in one of these formats: ${VIDEO_FORMATS_LABEL}.`,
                placement: 'bottomRight',
            })
            return false
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            notification.error({ message: `Video must be under ${MAX_UPLOAD_MB} MB.`, placement: 'bottomRight' })
            return false
        }

        let duration: number

        try {
            duration = await getVideoDuration(file)
        } catch {
            notification.error({
                message: 'Could not read the video. Please try a different file.',
                placement: 'bottomRight',
            })
            return false
        }

        if (duration > MAX_DURATION_S) {
            notification.error({
                message: `Video must be ${MAX_DURATION_S} seconds or shorter.`,
                placement: 'bottomRight',
            })
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
    const handleDropReplace = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files?.[0]

        if (!file) {
            return
        }

        const accepted = await acceptFile(file)

        if (accepted) {
            onSelect(file)
        }
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
                        accept={ACCEPT}
                        maxCount={1}
                        showUploadList={false}
                        beforeUpload={async (incoming) => {
                            const accepted = await acceptFile(incoming)

                            if (accepted) {
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
                accept={ACCEPT}
                maxCount={1}
                showUploadList={false}
                beforeUpload={async (incoming) => {
                    const accepted = await acceptFile(incoming)

                    if (accepted) {
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
                        aria-label={`Accepted files: ${VIDEO_FORMATS_LABEL} · up to ${MAX_UPLOAD_MB} MB · up to ${MAX_DURATION_S} seconds`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        Requirements
                    </Tag>
                </Tooltip>
            </Dragger>
        </div>
    )
}
