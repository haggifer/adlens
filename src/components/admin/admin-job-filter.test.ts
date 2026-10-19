import { type AdminUser, JobStatus } from 'adlens-shared'
import dayjs from 'dayjs'
import { filterJobRows, isJobFilterActive, JOB_PERIOD_PRESETS, NO_JOB_FILTER, toJobPeriod } from './admin-job-filter'
import type { AdminJobRow } from './admin-usage'

const ANA: AdminUser = {
    id: '66f0000000000000000000a1',
    createdAt: '2026-09-01T10:00:00.000Z',
    email: 'Ana@Example.com',
    isAnonymous: false,
    emailVerified: true,
    isAdmin: false,
}

const rowOf = (id: string, createdAt: string, user?: AdminUser): AdminJobRow => ({
    job: {
        id,
        createdAt,
        status: JobStatus.Analyzed,
        userId: user?.id ?? 'demo',
        file: { name: `${id}.mp4` },
    },
    name: `${id}.mp4`,
    user,
    isUnrecorded: false,
})

const ROWS = [
    rowOf('ana-old', '2026-09-28T10:00:00.000Z', ANA),
    rowOf('ana-new', '2026-09-30T23:30:00.000Z', ANA),
    rowOf('anon', '2026-09-30T10:00:00.000Z', { ...ANA, id: '66f0000000000000000000b2', email: null }),
    rowOf('demo', '2026-09-30T10:00:00.000Z'),
]

const idsOf = (rows: AdminJobRow[]) => rows.map((row) => row.job.id)

describe('filterJobRows', () => {
    it('keeps every job without a filter', () => {
        expect(idsOf(filterJobRows(ROWS, NO_JOB_FILTER))).toEqual(['ana-old', 'ana-new', 'anon', 'demo'])
    })

    it('matches part of the owner’s email in any case, which no anonymous or ownerless job has', () => {
        expect(idsOf(filterJobRows(ROWS, { ...NO_JOB_FILTER, email: ' ana@EXAMPLE ' }))).toEqual(['ana-old', 'ana-new'])
    })

    it('matches part of the owner’s id', () => {
        expect(idsOf(filterJobRows(ROWS, { ...NO_JOB_FILTER, userId: '00b2' }))).toEqual(['anon'])
        expect(idsOf(filterJobRows(ROWS, { ...NO_JOB_FILTER, userId: 'demo' }))).toEqual(['demo'])
    })

    it('keeps jobs created within the period, both ends included', () => {
        const period = { from: Date.parse('2026-09-30T10:00:00.000Z'), to: Date.parse('2026-09-30T23:30:00.000Z') }

        expect(idsOf(filterJobRows(ROWS, { ...NO_JOB_FILTER, period }))).toEqual(['ana-new', 'anon', 'demo'])
    })

    it('keeps every job from the start of a period with no end', () => {
        const period = { from: Date.parse('2026-09-30T10:00:00.000Z'), to: null }

        expect(idsOf(filterJobRows(ROWS, { ...NO_JOB_FILTER, period }))).toEqual(['ana-new', 'anon', 'demo'])
    })

    it('applies every filter together', () => {
        const period = { from: Date.parse('2026-09-29T00:00:00.000Z'), to: Date.parse('2026-10-01T00:00:00.000Z') }

        expect(idsOf(filterJobRows(ROWS, { email: 'ana', userId: '00a1', period }))).toEqual(['ana-new'])
    })
})

describe('JOB_PERIOD_PRESETS', () => {
    const NOW = dayjs('2026-10-13T14:41:30')

    it('starts each preset at its window: today, a rolling 7 and 30 days, and the month', () => {
        const starts = JOB_PERIOD_PRESETS.map(({ getFrom }) => getFrom(NOW).format('YYYY-MM-DD HH:mm'))

        expect(starts).toEqual(['2026-10-13 00:00', '2026-10-06 14:41', '2026-09-13 14:41', '2026-10-01 00:00'])
    })
})

describe('toJobPeriod', () => {
    const NOW = dayjs('2026-10-13T14:41:30')

    it('widens both ends to the minute', () => {
        const period = toJobPeriod(dayjs('2026-10-01T09:15:42'), dayjs('2026-10-02T18:05:10'), NOW)

        expect(period).toEqual({
            from: dayjs('2026-10-01T09:15:00.000').valueOf(),
            to: dayjs('2026-10-02T18:05:59.999').valueOf(),
        })
    })

    it('leaves a period ending in the minute it was picked open, so later jobs still show', () => {
        expect(toJobPeriod(NOW.startOf('day'), NOW, NOW).to).toBeNull()
        expect(toJobPeriod(NOW.startOf('day'), NOW.endOf('day'), NOW).to).toBe(NOW.endOf('day').valueOf())
    })
})

describe('isJobFilterActive', () => {
    it('ignores fields that are empty or only spaces', () => {
        expect(isJobFilterActive(NO_JOB_FILTER)).toBe(false)
        expect(isJobFilterActive({ ...NO_JOB_FILTER, email: '  ' })).toBe(false)
        expect(isJobFilterActive({ ...NO_JOB_FILTER, userId: 'u' })).toBe(true)
        expect(isJobFilterActive({ ...NO_JOB_FILTER, period: { from: 0, to: 1 } })).toBe(true)
    })
})
