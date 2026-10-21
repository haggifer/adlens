import { JOB_STATUS_LABELS } from '@/labels'
import { renderWithProviders } from '@/test/render'
import { screen, within } from '@testing-library/react'
import { type AdminJob, type AdminModelCall, type AdminUser, JobStatus } from 'adlens-shared'
import { ANONYMOUS_EMAIL } from './admin-table'
import { formatJobCount } from './JobFilters'
import { JobsTable, NO_SUCH_OWNER_TIP, UNKNOWN_OWNER_TIP } from './JobsTable'

// Gemini 3.6 Flash at its introductory global rate ($0.75 in, $3.75 out per 1M).
const CALL: AdminModelCall = {
    at: '2026-09-30T10:01:00.000Z',
    model: 'gemini-3.6-flash',
    location: 'global',
    promptTokens: 8447,
    candidatesTokens: 127,
    thoughtsTokens: 965,
    cachedTokens: 0,
    promptTokensByModality: { AUDIO: 750, VIDEO: 1980, TEXT: 5717 },
    cachedTokensByModality: {},
    durationMs: 22040,
}

const USER: AdminUser = {
    id: 'u1',
    createdAt: '2026-09-01T10:00:00.000Z',
    email: 'ana@example.com',
    isAnonymous: false,
    emailVerified: true,
    isAdmin: false,
}

const toJob = (id: string, fields: Partial<AdminJob> = {}): AdminJob => ({
    id,
    createdAt: '2026-09-30T10:00:00.000Z',
    status: JobStatus.Analyzed,
    userId: 'u1',
    file: { name: `${id}.mp4` },
    usage: { calls: [CALL] },
    ...fields,
})

// Via the name's text rather than getByRole('row', { name }): computing every row's accessible name in an antd table
// is slow enough to time out under a full test run.
const getRow = (name: string): HTMLElement => {
    const row = screen.getByText(name).closest('tr')

    if (!row) {
        throw new Error(`No table row holds ${name}`)
    }

    return row
}

// hidden: true skips the visibility check, which reads computed styles up the tree for every element of this wide table
// and takes seconds.
const getCellElements = (name: string) => within(getRow(name)).getAllByRole('cell', { hidden: true })

const getCells = (name: string) => getCellElements(name).map((cell) => cell.textContent)

const getModelCell = (name: string) => getCells(name)[5]

// After Created, Name, Status, User email, User id and Model.
const getUsageCells = (name: string) => getCells(name).slice(6)

const getEmailCell = (name: string) => getCellElements(name)[3]

const getHeaders = () => screen.getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent)

// Every job here is named by its file.
const getShownNames = () => screen.getAllByText(/\.mp4$/).map((name) => name.textContent)

// The filter test types into a field over a wide antd table: seconds of work under a full parallel run.
jest.setTimeout(20_000)

describe('JobsTable', () => {
    it('shows each kind of token with its cost, and the job’s total cost', () => {
        renderWithProviders(<JobsTable users={[USER]} jobs={[toJob('upload')]} />)

        expect(getUsageCells('upload.mp4')).toEqual([
            '1,980 ($0.0015)',
            '750 ($0.0006)',
            '5,717 ($0.0043)',
            '0 ($0.0000)',
            '965 ($0.0036)',
            '127 ($0.0005)',
            '$0.010',
            '22.0 s',
        ])
        expect(getHeaders()).not.toContain('Other input')
    })

    it('shows the cached input at its cached cost, after the input columns', () => {
        const call = { ...CALL, cachedTokens: 4000, cachedTokensByModality: { TEXT: 4000 } }

        renderWithProviders(<JobsTable users={[USER]} jobs={[toJob('cached', { usage: { calls: [call] } })]} />)

        const headers = getHeaders()

        expect(headers.indexOf('Cached input')).toBe(headers.indexOf('Text input') + 1)
        expect(getUsageCells('cached.mp4')[3]).toBe('4,000 ($0.0003)')
    })

    it('names a sample job by its sample’s title with a Sample tag, or by its file once the sample is gone', () => {
        renderWithProviders(
            <JobsTable
                users={[USER]}
                jobs={[
                    toJob('kept', { sampleId: 's1', sampleTitle: 'Coffee ad' }),
                    toJob('gone', { sampleId: 's2' }),
                    toJob('upload'),
                ]}
            />,
        )

        expect(within(getRow('Coffee ad')).getByText('Sample')).toBeInTheDocument()
        expect(within(getRow('gone.mp4')).getByText('Sample')).toBeInTheDocument()
        expect(within(getRow('upload.mp4')).queryByText('Sample')).not.toBeInTheDocument()
        expect(screen.queryByText('kept.mp4')).not.toBeInTheDocument()
    })

    it('shows a dash for every token and cost of a job without recorded calls', () => {
        renderWithProviders(
            <JobsTable users={[USER]} jobs={[toJob('old', { usage: {} }), toJob('never', { usage: undefined })]} />,
        )

        expect(getUsageCells('old.mp4')).toEqual(['—', '—', '—', '—', '—', '—', '—', '—'])
        expect(getUsageCells('never.mp4')).toEqual(['—', '—', '—', '—', '—', '—', '—', '—'])
        expect(getModelCell('old.mp4')).toBe('—')
        expect(getModelCell('never.mp4')).toBe('—')
    })

    it('names the models the job’s calls ran on, each once, before the token columns', () => {
        const calls = [CALL, { ...CALL, model: 'gemini-4-argon' }, CALL]

        renderWithProviders(<JobsTable users={[USER]} jobs={[toJob('retried', { usage: { calls } })]} />)

        const headers = getHeaders()

        expect(headers.indexOf('Model')).toBe(headers.indexOf('Video input') - 1)
        expect(getModelCell('retried.mp4')).toBe(`${CALL.model}, gemini-4-argon`)
    })

    it('shows how long the job’s Gemini calls took together, after the cost', () => {
        const calls = [CALL, { ...CALL, durationMs: 1500 }]

        renderWithProviders(<JobsTable users={[USER]} jobs={[toJob('two', { usage: { calls } })]} />)

        const headers = getHeaders()

        expect(headers.indexOf('AI duration')).toBe(headers.indexOf('Cost') + 1)
        expect(getUsageCells('two.mp4').at(-1)).toBe('23.5 s')
    })

    it('shows a dash for the duration of a job with a call recorded before calls were timed', () => {
        const calls = [CALL, { ...CALL, durationMs: undefined }]

        renderWithProviders(<JobsTable users={[USER]} jobs={[toJob('untimed', { usage: { calls } })]} />)

        expect(getUsageCells('untimed.mp4').at(-1)).toBe('—')
    })

    it('keeps the tokens of an unpriced model but shows its costs as a dash', () => {
        renderWithProviders(
            <JobsTable
                users={[USER]}
                jobs={[toJob('future', { usage: { calls: [{ ...CALL, model: 'some-future-model' }] } })]}
            />,
        )

        const cells = getUsageCells('future.mp4')

        expect(cells[0]).toBe('1,980 (—)')
        expect(cells.slice(-2)).toEqual(['—', '22.0 s'])
    })

    it('adds an Other input column only when some job has another modality', () => {
        const call = {
            ...CALL,
            promptTokens: 8547,
            promptTokensByModality: { ...CALL.promptTokensByModality, IMAGE: 100 },
        }

        renderWithProviders(<JobsTable users={[USER]} jobs={[toJob('image', { usage: { calls: [call] } })]} />)

        expect(getHeaders()).toContain('Other input')
        expect(within(getRow('image.mp4')).getByText('100 ($0.0001)')).toBeInTheDocument()
    })

    it('lists the newest job first', () => {
        renderWithProviders(
            <JobsTable
                users={[USER]}
                jobs={[
                    toJob('older', { createdAt: '2026-09-28T10:00:00.000Z' }),
                    toJob('newer', { createdAt: '2026-09-30T10:00:00.000Z' }),
                ]}
            />,
        )

        expect(getShownNames()).toEqual(['newer.mp4', 'older.mp4'])
    })

    it('tags each job with its status, as users see it', () => {
        renderWithProviders(
            <JobsTable jobs={[toJob('done'), toJob('failed', { status: JobStatus.Error })]} users={[USER]} />,
        )

        expect(within(getRow('done.mp4')).getByText(JOB_STATUS_LABELS[JobStatus.Analyzed])).toBeInTheDocument()
        expect(within(getRow('failed.mp4')).getByText(JOB_STATUS_LABELS[JobStatus.Error])).toBeInTheDocument()
    })

    it('shows the owner’s email and id, anonymous for an anonymous owner, and a dash for no known user', () => {
        renderWithProviders(
            <JobsTable
                jobs={[toJob('mine'), toJob('anon', { userId: 'u2' }), toJob('demo', { userId: 'demo' })]}
                users={[USER, { ...USER, id: 'u2', email: null, isAnonymous: true }]}
            />,
        )

        expect(within(getRow('mine.mp4')).getByText('ana@example.com')).toBeInTheDocument()
        expect(within(getRow('mine.mp4')).getByText('u1')).toBeInTheDocument()
        expect(within(getRow('anon.mp4')).getByText(ANONYMOUS_EMAIL)).toBeInTheDocument()
        expect(getEmailCell('demo.mp4').textContent).toBe('—')
        expect(within(getEmailCell('demo.mp4')).getByLabelText(NO_SUCH_OWNER_TIP)).toBeInTheDocument()
    })

    it('says the owner is unknown, not deleted, when the users couldn’t be read', () => {
        renderWithProviders(<JobsTable jobs={[toJob('mine')]} users={[]} isUserListMissing />)

        const emailCell = within(getEmailCell('mine.mp4'))

        expect(emailCell.getByLabelText(UNKNOWN_OWNER_TIP)).toBeInTheDocument()
        expect(emailCell.queryByLabelText(NO_SUCH_OWNER_TIP)).not.toBeInTheDocument()
    })

    it('filters by the owner’s email and id, and counts what the filter leaves', async () => {
        const { user } = renderWithProviders(
            <JobsTable
                jobs={[toJob('mine'), toJob('theirs', { userId: 'u2' })]}
                users={[USER, { ...USER, id: 'u2', email: 'bob@example.com' }]}
            />,
        )

        await user.type(screen.getByRole('textbox', { name: 'User email', hidden: true }), 'ANA@')

        expect(getShownNames()).toEqual(['mine.mp4'])
        expect(screen.getByText(formatJobCount(1, 2))).toBeInTheDocument()

        await user.clear(screen.getByRole('textbox', { name: 'User email', hidden: true }))
        await user.type(screen.getByRole('textbox', { name: 'User id', hidden: true }), 'u2')

        expect(getShownNames()).toEqual(['theirs.mp4'])
    })
})
