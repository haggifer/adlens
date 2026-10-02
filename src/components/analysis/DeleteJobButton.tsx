'use client'

import { toApiRequestError } from '@/api/errors'
import { MODAL_WIDTH } from '@/design/theme'
import { useDeleteJob } from '@/hooks/useDeleteJob'
import { isJobInProgress } from '@/job-status'
import { DeleteOutlined } from '@ant-design/icons'
import type { Job } from 'adlens-shared'
import { App, Button, Tooltip } from 'antd'

interface IProps {
    job: Job
    isIconOnly?: boolean
    onDeleted?: () => void
}

export function DeleteJobButton({ job, isIconOnly, onDeleted }: IProps) {
    const { modal, notification } = App.useApp()

    const { deleteJob } = useDeleteJob()

    const isRunning = isJobInProgress(job.status)

    const handleDelete = async () => {
        try {
            await deleteJob(job.id)
            notification.success({ title: 'Analysis deleted', placement: 'bottomRight' })
            onDeleted?.()
        } catch (error) {
            console.error(error)
            notification.error({ title: toApiRequestError(error).message, placement: 'bottomRight' })
        }
    }

    const handleClick = () => {
        modal.confirm({
            title: 'Delete this analysis?',
            width: MODAL_WIDTH,
            content: job.sampleId
                ? 'The analysis will be deleted permanently.'
                : 'The analysis and the uploaded video will be deleted permanently. This can’t be undone.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: handleDelete,
        })
    }

    const button = (
        <Button
            danger
            icon={<DeleteOutlined />}
            disabled={isRunning}
            aria-label="Delete analysis"
            onClick={handleClick}
        >
            {isIconOnly ? null : 'Delete'}
        </Button>
    )

    if (isRunning) {
        return (
            <Tooltip title="You can delete it once the analysis finishes">
                <span>{button}</span>
            </Tooltip>
        )
    }

    return button
}
