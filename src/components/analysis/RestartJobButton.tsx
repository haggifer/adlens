'use client'

import { toApiRequestError } from '@/api/errors'
import { ButtonTooltip } from '@/components/utils/ButtonTooltip'
import { useRestartJob } from '@/hooks/useRestartJob'
import { RedoOutlined } from '@ant-design/icons'
import type { Job } from 'adlens-shared'
import { App, Button } from 'antd'
import { useRouter } from 'next/navigation'

interface IProps {
    job: Job
    isIconOnly?: boolean
}

// Runs a failed analysis again on its video. The API checks that the video is still there before anything changes,
// so the user stays where they are, the button loading, until the new run has started, and only then moves to it.
export function RestartJobButton({ job, isIconOnly }: IProps) {
    const router = useRouter()
    const { notification } = App.useApp()

    const { restartJob, isRestarting } = useRestartJob()

    const handleClick = async () => {
        try {
            const restarted = await restartJob(job.id)

            router.push(`/analyses/${restarted.id}`)
        } catch (error) {
            console.error(error)
            notification.error({ title: toApiRequestError(error).message, placement: 'bottomRight' })
        }
    }

    if (isIconOnly) {
        return (
            <ButtonTooltip title="Restart analysis">
                <Button
                    size="small"
                    type="text"
                    icon={<RedoOutlined />}
                    loading={isRestarting}
                    aria-label="Restart analysis"
                    onClick={handleClick}
                />
            </ButtonTooltip>
        )
    }

    return (
        <Button type="primary" loading={isRestarting} onClick={handleClick}>
            Restart analysis
        </Button>
    )
}
