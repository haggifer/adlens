import { render, screen } from '@testing-library/react'
import { JobStatus } from 'adlens-shared'
import { buildJob } from '@/test/fixtures'
import { JobStatusPanel } from './JobStatusPanel'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('JobStatusPanel', () => {
    it('describes each step of a running analysis in plain words', () => {
        render(<JobStatusPanel job={buildJob({ status: JobStatus.Queued })} />)

        expect(screen.getByText('Checking the video')).toBeInTheDocument()
        expect(screen.getByText('Starting the analysis')).toBeInTheDocument()
        expect(screen.getByText('Analyzing the ad')).toBeInTheDocument()
    })
})
