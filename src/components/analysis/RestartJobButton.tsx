'use client'

import { toApiRequestError } from '@/api/errors'
import { ButtonTooltip } from '@/components/utils/ButtonTooltip'
import { useRestartJob } from '@/hooks/useRestartJob'
import { RedoOutlined } from '@ant-design/icons'
import type { Job } from 'adlens-shared'
import { App, Button } from 'antd'
import { usePathname, useRouter } from 'next/navigation'

interface IProps {
    job: Job
    isIconOnly?: boolean
}

// Runs a failed analysis again on its video. The API checks that the video is still there before anything changes,
// so the user stays where they are, the button loading, until the new run has started, and only then moves to it.
export function RestartJobButton({ job, isIconOnly }: IProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { notification } = App.useApp()

    const { restartJob, isRestarting } = useRestartJob()

    // The failed run's own page gives way to its restart, so Back skips it; History stays in the history.
    const isOnFailedPage = pathname === `/analyses/${job.id}`

    const handleClick = async () => {
        try {
            const restarted = await restartJob(job.id)

            const path = `/analyses/${restarted.id}`

            if (isOnFailedPage) {
                router.replace(path)
            } else {
                router.push(path)
            }
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
