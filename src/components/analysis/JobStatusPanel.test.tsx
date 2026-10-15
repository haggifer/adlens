import { buildJob } from '@/test/fixtures'
import { render, screen } from '@testing-library/react'
import { JobStatus } from 'adlens-shared'
import { JobStatusPanel } from './JobStatusPanel'

const DISCONNECTED_COPY = 'Can’t reach AdLens right now. This page updates once it’s back.'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('JobStatusPanel', () => {
    it('describes each step of a running analysis in plain words', () => {
        render(<JobStatusPanel job={buildJob({ status: JobStatus.Queued })} />)

        expect(screen.getByText('Checking the video')).toBeInTheDocument()
        expect(screen.getByText('Starting the analysis')).toBeInTheDocument()
        expect(screen.getByText('Analyzing the ad')).toBeInTheDocument()
    })

    it('animates the running step', () => {
        render(<JobStatusPanel job={buildJob({ status: JobStatus.Analyzing })} />)

        expect(screen.getByRole('img', { name: 'notification', hidden: true })).toBeInTheDocument()
    })

    it('marks the finished steps with a solid circle, and only them', () => {
        render(<JobStatusPanel job={buildJob({ status: JobStatus.Analyzing })} />)

        const icons = [...document.querySelectorAll<HTMLElement>('.ant-steps-item-icon')]

        expect(icons.map((icon) => icon.style.background !== '')).toEqual([true, true, false])
    })

    it('says when it can’t reach AdLens, so a stalled step isn’t taken for a slow one', () => {
        render(<JobStatusPanel job={buildJob({ status: JobStatus.Queued })} isDisconnected />)

        expect(screen.getByText(DISCONNECTED_COPY)).toBeInTheDocument()
    })
})
