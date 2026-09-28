'use client'

import type { Sample } from 'adlens-shared'
import { Alert, Empty, Modal, Skeleton, type SkeletonProps, Tag } from 'antd'
import { KeyboardEvent, SyntheticEvent } from 'react'
import { formatSeconds } from '@/components/analysis/results'
import useSamples from '@/hooks/useSamples'
import { PLATFORM_LABELS } from '@/labels'
import { useStyles } from './styles'

const SKELETON_ROWS = 3

const SKELETON_AVATAR: SkeletonProps['avatar'] = { shape: 'square', size: 96 }

const SKELETON_PARAGRAPH: SkeletonProps['paragraph'] = { rows: 2 }

// The preview's own controls must work without selecting the row around it.
const stopPropagation = (event: SyntheticEvent) => event.stopPropagation()

export const SampleRow = ({ sample, onSelect }: { sample: Sample; onSelect: (sample: Sample) => void }) => {
    const { styles } = useStyles()
    const { platforms } = sample.settings

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(sample)
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Use sample ad: ${sample.title}`}
            className={styles.sampleRow}
            onClick={() => onSelect(sample)}
            onKeyDown={handleKeyDown}
        >
            <div className={styles.sampleThumb} onClick={stopPropagation} onKeyDown={stopPropagation}>
                <video src={sample.previewUrl} controls preload="metadata" playsInline />
            </div>
            <div className={styles.sampleInfo}>
                <div className={styles.sampleHead}>
                    <span className={styles.sampleTitle}>{sample.title}</span>
                    <span className={styles.sampleDuration}>{formatSeconds(sample.media.durationS)}</span>
                </div>
                <div className="d-flex flex-wrap gap-1">
                    {platforms.length ? (
                        platforms.map((platform) => <Tag key={platform}>{PLATFORM_LABELS[platform]}</Tag>)
                    ) : (
                        <Tag>General rules</Tag>
                    )}
                </div>
                <p className={styles.sampleDescription}>{sample.description}</p>
            </div>
        </div>
    )
}

interface IProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (sample: Sample) => void
}

export default function SamplesModal({ isOpen, onClose, onSelect }: IProps) {
    const { styles } = useStyles()
    const { samples, isLoading, error } = useSamples(isOpen)

    const renderBody = () => {
        if (error) {
            return <Alert type="error" showIcon title={error.message} />
        }

        if (isLoading) {
            return Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <Skeleton key={index} active avatar={SKELETON_AVATAR} paragraph={SKELETON_PARAGRAPH} />
            ))
        }

        if (!samples.length) {
            return <Empty description="No sample ads are available yet." />
        }

        return samples.map((sample) => <SampleRow key={sample.id} sample={sample} onSelect={onSelect} />)
    }

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={720}
            centered
            destroyOnHidden
            title="Try a sample ad"
        >
            <p className={styles.hint}>
                Pick an ad to see what AdLens checks. Its platforms and markets are filled in for you, and you can
                change them before running the analysis.
            </p>
            <div className={styles.sampleList}>{renderBody()}</div>
        </Modal>
    )
}
