import { buildJob } from '@/test/fixtures'
import { render, screen } from '@testing-library/react'
import { JobStatus } from 'adlens-shared'
import { JobStatusPanel } from './JobStatusPanel'

const RUNNING_STEPS = [JobStatus.Verifying, JobStatus.Queued, JobStatus.Analyzing]

const DISCONNECTED_COPY = 'Can’t reach AdLens right now. This page updates once it’s back.'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('JobStatusPanel', () => {
    it.each(RUNNING_STEPS)('animates the running step while %s', (status) => {
        render(<JobStatusPanel job={buildJob({ status })} />)

        const animation = screen.getByRole('img', { name: 'notification', hidden: true })
        const steps = [...document.querySelectorAll('.ant-steps-item')]

        expect(steps.findIndex((step) => step.contains(animation))).toBe(RUNNING_STEPS.indexOf(status))
    })

    it('marks the finished steps with a solid circle, and only them', () => {
        render(<JobStatusPanel job={buildJob({ status: JobStatus.Analyzing })} />)

        const icons = [...document.querySelectorAll<HTMLElement>('.ant-steps-item-icon')]

        expect(icons.map((icon) => icon.style.background !== '')).toEqual([true, true, false])
    })

    it('says when it can’t reach AdLens, so a stalled step isn’t taken for a slow one', () => {
        const job = buildJob({ status: JobStatus.Queued })
        const { rerender } = render(<JobStatusPanel job={job} isDisconnected />)

        expect(screen.getByText(DISCONNECTED_COPY)).toBeInTheDocument()

        rerender(<JobStatusPanel job={job} isDisconnected={false} />)

        expect(screen.queryByText(DISCONNECTED_COPY)).not.toBeInTheDocument()
    })
})
