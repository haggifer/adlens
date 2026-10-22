'use client'

import { LazyVideoPlayer } from '@/components/player/LazyVideoPlayer'
import { toMediaRatioStyle } from '@/components/utils/vidstack'
import { toMegabytes } from '@/file-size'
import { MAX_DURATION_LABEL, VIDEO_FORMATS_LABEL } from '@/labels'
import { readFileSnapshot } from '@/storage/file-snapshot'
import { DeleteOutlined, InboxOutlined, InfoCircleOutlined, PlaySquareOutlined, SwapOutlined } from '@ant-design/icons'
import { MAX_DURATION_S, MAX_UPLOAD_BYTES } from 'adlens-shared'
import { App, Button, Divider, Spin, Tag, Tooltip, type TooltipProps, Upload } from 'antd'
import { useTheme } from 'antd-style'
import { DragEvent, SyntheticEvent, useEffect, useRef, useState } from 'react'
import { useStyles } from './styles'
import type { AcceptedFile, AcceptedVideo, SelectedVideo, VideoMetadata } from './types'
import { UPLOAD_NOTICE } from './upload-notices'
import { toVideoMimeType, VIDEO_FILE_ACCEPT } from './video-type'

const { Dragger } = Upload

const MAX_UPLOAD_MB = toMegabytes(MAX_UPLOAD_BYTES)

const REQUIREMENTS_TRIGGER: TooltipProps['trigger'] = ['hover', 'click']

// Neither the copy nor the metadata read reports a stall (a file another app never finishes, a video the browser
// neither loads nor rejects); past this a pick is given up, so the panel isn't locked until a reload.
const READ_TIMEOUT_MS = 30_000

// For the two buttons inside the Dragger: their clicks and keys must not reach it and open the file dialog. Anything
// else in the drop zone, its text and divider included, opens it.
const stopAtControl = (event: SyntheticEvent) => event.stopPropagation()

// A drop target must cancel dragover, or the browser never fires drop on it.
const allowDrop = (event: DragEvent<HTMLDivElement>) => event.preventDefault()

// The copy itself can't be cancelled; a late one is simply dropped.
const withReadTimeout = <T,>(read: Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Reading the video timed out')), READ_TIMEOUT_MS)

        read.then(resolve, reject).finally(() => clearTimeout(timer))
    })

// Rejected reads (a file the browser can't decode) surface as an error so a doomed upload is stopped client-side.
const readVideoMetadata = (file: File): Promise<VideoMetadata> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const video = document.createElement('video')
        const settle = () => {
            clearTimeout(timer)
            URL.revokeObjectURL(url)
            video.onloadedmetadata = null
            video.onerror = null
        }
        const timer = setTimeout(() => {
            settle()
            reject(new Error('Reading the video metadata timed out'))
        }, READ_TIMEOUT_MS)

        video.preload = 'metadata'
        video.onloadedmetadata = () => {
            settle()
            resolve({ durationS: video.duration, width: video.videoWidth, height: video.videoHeight })
        }
        video.onerror = () => {
            settle()
            reject(new Error('Could not read video metadata'))
        }
        video.src = url
    })

interface IProps {
    video: SelectedVideo | null
    onSelect: (file: File, video: AcceptedVideo) => void
    onClear: () => void
    onBrowseSamples: () => void
    // Set while an analysis runs: the video and its source can't change under it.
    isDisabled?: boolean
    // Set while a picked video is copied and checked, which takes seconds on a phone; Run waits for it too.
    isReading: boolean
    onReadingChange: (isReading: boolean) => void
}

export function UploadPanel({
    video,
    onSelect,
    onClear,
    onBrowseSamples,
    isDisabled = false,
    isReading,
    onReadingChange,
}: IProps) {
    const theme = useTheme()
    const { styles, cx } = useStyles()
    const { notification } = App.useApp()

    const [isDragging, setIsDragging] = useState(false)
    // Read once a pick's copy is done, after an await, when the props of the render that started it may be stale.
    const isDisabledRef = useRef(isDisabled)
    // Set in the tick a pick starts, so a second pick can't slip in before the panel re-renders locked.
    const isReadingRef = useRef(false)

    const isLocked = isDisabled || isReading

    const requirements = (
        <div className="d-flex flex-column gap-1">
            <div>
                <span className={styles.reqKey}>Formats:</span> {VIDEO_FORMATS_LABEL}
            </div>
            <div>
                <span className={styles.reqKey}>Size:</span> up to {MAX_UPLOAD_MB} MB
            </div>
            <div>
                <span className={styles.reqKey}>Length:</span> up to {MAX_DURATION_LABEL}
            </div>
        </div>
    )

    const notifyRejected = (title: string) => notification.error({ title, placement: 'bottomRight' })

    // Client-side gate only — the server's ffprobe check is the real boundary; this just avoids a doomed upload. The
    // type and size come first, so a file that can't be used is never copied into memory.
    const verifyFile = async (picked: File): Promise<AcceptedFile | null> => {
        const contentType = toVideoMimeType(picked.type)

        if (!contentType) {
            notifyRejected(UPLOAD_NOTICE.unsupportedFormat)
            return null
        }

        if (picked.size > MAX_UPLOAD_BYTES) {
            notifyRejected(UPLOAD_NOTICE.tooLarge)
            return null
        }

        let file: File

        try {
            file = await withReadTimeout(readFileSnapshot(picked))
        } catch {
            notifyRejected(UPLOAD_NOTICE.unreadableFile)
            return null
        }

        let metadata: VideoMetadata

        try {
            metadata = await readVideoMetadata(file)
        } catch {
            notifyRejected(UPLOAD_NOTICE.unreadableMetadata)
            return null
        }

        if (metadata.durationS > MAX_DURATION_S) {
            notifyRejected(UPLOAD_NOTICE.tooLong)
            return null
        }

        return { file, video: { ...metadata, contentType } }
    }

    // One pick at a time. A pick that finishes once a run has locked the panel is dropped: the run keeps the video it
    // started with.
    const selectIfAccepted = async (picked: File) => {
        if (isReadingRef.current) {
            return
        }

        isReadingRef.current = true
        onReadingChange(true)

        let accepted: AcceptedFile | null = null

        try {
            accepted = await verifyFile(picked)
        } finally {
            isReadingRef.current = false
            onReadingChange(false)
        }

        if (accepted && !isDisabledRef.current) {
            onSelect(accepted.file, accepted.video)
        }
    }

    const handleBrowseSamples = (event: SyntheticEvent) => {
        stopAtControl(event)
        onBrowseSamples()
    }

    const handleBeforeUpload = async (incoming: File) => {
        await selectIfAccepted(incoming)

        return false
    }

    const handleDragEnter = () => setIsDragging(!isLocked)

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false)
        }
    }

    // antd's Dragger owns the empty state, so the video state gets its own drop handler.
    const handleDropReplace = async (event: DragEvent<HTMLDivElement>) => {
        const file = event.dataTransfer.files?.[0]

        event.preventDefault()
        setIsDragging(false)

        if (!file || isLocked) {
            return
        }

        await selectIfAccepted(file)
    }

    const renderReading = () =>
        isReading && (
            <div className={styles.reading} role="status">
                <Spin description="Reading your video…" />
            </div>
        )

    useEffect(() => {
        isDisabledRef.current = isDisabled
    }, [isDisabled])

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
                <LazyVideoPlayer
                    className={styles.player}
                    url={video.url}
                    contentType={video.type}
                    isEager
                    ariaLabel={video.sampleTitle ? `Sample ad: ${video.sampleTitle}` : 'Uploaded video ad'}
                />
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
                        disabled={isLocked}
                        beforeUpload={handleBeforeUpload}
                    >
                        <Button
                            shape="circle"
                            icon={<SwapOutlined />}
                            aria-label="Replace video"
                            title="Replace"
                            disabled={isLocked}
                        />
                    </Upload>
                    <Button
                        shape="circle"
                        icon={<DeleteOutlined />}
                        aria-label="Remove video"
                        title="Remove"
                        onClick={onClear}
                        disabled={isLocked}
                    />
                </div>
                {renderReading()}
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
                disabled={isLocked}
                beforeUpload={handleBeforeUpload}
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
                        aria-label={`Requirements: ${VIDEO_FORMATS_LABEL} · up to ${MAX_UPLOAD_MB} MB · up to ${MAX_DURATION_LABEL}`}
                        onClick={stopAtControl}
                        onKeyDown={stopAtControl}
                    >
                        Requirements
                    </Button>
                </Tooltip>
                <div className={styles.samplesPrompt}>
                    <Divider
                        plain
                        className={styles.samplesDivider}
                        styles={{ rail: { borderColor: theme.colorBorder } }}
                    >
                        or
                    </Divider>
                    <span>No ad at hand?</span>
                    <Button
                        size="small"
                        icon={<PlaySquareOutlined />}
                        onClick={handleBrowseSamples}
                        onKeyDown={stopAtControl}
                        disabled={isLocked}
                    >
                        Try a sample ad
                    </Button>
                </div>
            </Dragger>
            {renderReading()}
        </div>
    )
}
