'use client'

import { useState } from 'react'
import { DeleteOutlined, InboxOutlined, InfoCircleOutlined, SwapOutlined } from '@ant-design/icons'
import { Button, Tooltip, Upload } from 'antd'
import useStyles from './styles'

interface IProps {
    videoUrl: string | null
    onSelect: (file: File) => void
    onClear: () => void
}

const { Dragger } = Upload

export default function UploadPanel({ videoUrl, onSelect, onClear }: IProps) {
    const { styles } = useStyles()
    const [isDragging, setIsDragging] = useState(false)

    const requirements = (
        <div className="d-flex flex-column gap-1">
            <div>
                <span className={styles.reqKey}>Formats:</span> MP4, MOV, WEBM, AVI, FLV, MPEG, WMV, 3GPP
            </div>
            <div>
                <span className={styles.reqKey}>Size:</span> up to 200 MB
            </div>
        </div>
    )

    if (videoUrl) {
        return (
            <div className={styles.frame} data-video="true">
                <video className={styles.video} src={videoUrl} controls preload="metadata" />
                <div data-overlay className={styles.overlay}>
                    <Upload
                        accept="video/*"
                        maxCount={1}
                        showUploadList={false}
                        beforeUpload={(incoming) => {
                            onSelect(incoming)
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
            onDragEnter={() => setIsDragging(true)}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setIsDragging(false)
                }
            }}
            onDrop={() => setIsDragging(false)}
        >
            <Tooltip placement="bottom" title={requirements}>
                <span
                    className={styles.info}
                    role="img"
                    aria-label="Accepted file requirements"
                    onClick={(event) => event.stopPropagation()}
                >
                    <InfoCircleOutlined />
                </span>
            </Tooltip>
            <Dragger
                className={styles.dragger}
                accept="video/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(incoming) => {
                    onSelect(incoming)
                    return false
                }}
            >
                <p className={styles.icon} data-icon>
                    <InboxOutlined />
                </p>
                <p className={styles.title}>Drop your video ad here</p>
                <p className={styles.hint}>Click or drag to upload</p>
            </Dragger>
        </div>
    )
}
