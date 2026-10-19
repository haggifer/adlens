import { AccountKind } from '@/auth/types'
import { type AdminJob, type AdminModelCall, type AdminUser, JobStatus } from 'adlens-shared'
import {
    formatTokenTally,
    getUserType,
    hasOtherInput,
    summarizeJobUsage,
    toJobRows,
    TokenKind,
    toUserRows,
} from './admin-usage'
import { type GeminiCall, priceGeminiCall } from './model-pricing'

// The model-pricing tests' run: Gemini 3.6 Flash at its introductory global rate ($0.75 in, $3.75 out per 1M).
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
}

const CACHED_CALL: AdminModelCall = { ...CALL, cachedTokens: 4000, cachedTokensByModality: { TEXT: 4000 } }

// CALL as the pricing sees it.
const GEMINI_CALL: GeminiCall = {
    model: CALL.model,
    location: CALL.location,
    at: CALL.at,
    inputTokensByModality: CALL.promptTokensByModality,
    cachedTokensByModality: {},
    thoughtsTokens: CALL.thoughtsTokens,
    candidatesTokens: CALL.candidatesTokens,
}

const jobWith = (fields: Partial<AdminJob> = {}): AdminJob => ({
    id: 'j1',
    createdAt: '2026-09-30T10:00:00.000Z',
    status: JobStatus.Analyzed,
    userId: 'u1',
    file: { name: 'ad.mp4' },
    usage: { calls: [CALL] },
    ...fields,
})

describe('summarizeJobUsage', () => {
    it('splits a call’s tokens by kind, each with its cost, and totals the cost', () => {
        const usage = summarizeJobUsage(jobWith())

        expect(usage?.byKind).toEqual({
            [TokenKind.VideoInput]: { tokens: 1980, usd: expect.closeTo(0.001485, 10) },
            [TokenKind.AudioInput]: { tokens: 750, usd: expect.closeTo(0.0005625, 10) },
            [TokenKind.TextInput]: { tokens: 5717, usd: expect.closeTo(0.00428775, 10) },
            [TokenKind.OtherInput]: { tokens: 0, usd: 0 },
            [TokenKind.CachedInput]: { tokens: 0, usd: 0 },
            [TokenKind.Thinking]: { tokens: 965, usd: expect.closeTo(0.00361875, 10) },
            [TokenKind.Output]: { tokens: 127, usd: expect.closeTo(0.00047625, 10) },
        })
        expect(usage?.usd).toBeCloseTo(0.01043025, 10)
    })

    it('tallies the cached input at the cached rate and discounts its modality’s input cost', () => {
        const usage = summarizeJobUsage(jobWith({ usage: { calls: [CACHED_CALL] } }))
        const cost = priceGeminiCall({ ...GEMINI_CALL, cachedTokensByModality: { TEXT: 4000 } })

        expect(usage?.byKind[TokenKind.CachedInput]).toEqual({ tokens: 4000, usd: cost?.cached })
        expect(usage?.byKind[TokenKind.TextInput]).toEqual({ tokens: 5717, usd: cost?.inputByModality.TEXT })
        expect(usage?.usd).toBe(cost?.total)
    })

    it('discounts each cached modality, and counts cached tokens without a breakdown as text', () => {
        const call = { ...CALL, cachedTokens: 1500, cachedTokensByModality: { VIDEO: 1000 } }
        const usage = summarizeJobUsage(jobWith({ usage: { calls: [call] } }))
        const cost = priceGeminiCall({ ...GEMINI_CALL, cachedTokensByModality: { VIDEO: 1000, TEXT: 500 } })

        expect(usage?.byKind[TokenKind.VideoInput].usd).toBe(cost?.inputByModality.VIDEO)
        expect(usage?.byKind[TokenKind.TextInput].usd).toBe(cost?.inputByModality.TEXT)
        expect(usage?.byKind[TokenKind.CachedInput]).toEqual({ tokens: 1500, usd: cost?.cached })
    })

    it('prices a call Vertex served on Flex at half', () => {
        const usage = summarizeJobUsage(jobWith({ usage: { calls: [{ ...CALL, trafficType: 'ON_DEMAND_FLEX' }] } }))

        expect(usage?.usd).toBe(priceGeminiCall({ ...GEMINI_CALL, trafficType: 'ON_DEMAND_FLEX' })?.total)
    })

    it('sums every call of the job', () => {
        const usage = summarizeJobUsage(jobWith({ usage: { calls: [CALL, CALL] } }))

        expect(usage?.byKind[TokenKind.VideoInput]).toEqual({ tokens: 3960, usd: expect.closeTo(0.00297, 10) })
        expect(usage?.usd).toBeCloseTo(0.0208605, 10)
    })

    it('files other modalities and unattributed input as other input', () => {
        const usage = summarizeJobUsage(
            jobWith({ usage: { calls: [{ ...CALL, promptTokens: 9000, promptTokensByModality: { IMAGE: 100 } }] } }),
        )

        expect(usage?.byKind[TokenKind.OtherInput].tokens).toBe(9000)
        expect(usage?.byKind[TokenKind.VideoInput].tokens).toBe(0)
    })

    it('keeps the tokens but drops the costs when a call’s model is unpriced', () => {
        const usage = summarizeJobUsage(jobWith({ usage: { calls: [CALL, { ...CALL, model: 'some-future-model' }] } }))

        expect(usage?.byKind[TokenKind.Thinking]).toEqual({ tokens: 1930, usd: undefined })
        expect(usage?.usd).toBeUndefined()
    })

    it('has nothing for a job without recorded calls', () => {
        expect(summarizeJobUsage(jobWith({ usage: undefined }))).toBeUndefined()
        expect(summarizeJobUsage(jobWith({ usage: {} }))).toBeUndefined()
        expect(summarizeJobUsage(jobWith({ usage: { calls: [] } }))).toBeUndefined()
    })
})

describe('hasOtherInput', () => {
    it('is true only when some job has other input', () => {
        const other = jobWith({
            usage: {
                calls: [
                    {
                        ...CALL,
                        promptTokensByModality: { ...CALL.promptTokensByModality, IMAGE: 1 },
                        promptTokens: 8448,
                    },
                ],
            },
        })

        expect(hasOtherInput([jobWith(), jobWith({ usage: undefined })].map(summarizeJobUsage))).toBe(false)
        expect(hasOtherInput([jobWith(), other].map(summarizeJobUsage))).toBe(true)
    })
})

describe('toJobRows', () => {
    it('names a job by its file, or a sample job by its sample’s title while the sample exists', () => {
        const rows = toJobRows(
            [
                jobWith(),
                jobWith({ id: 'j2', sampleId: 's1', sampleTitle: 'Coffee ad' }),
                jobWith({ id: 'j3', sampleId: 's2' }),
            ],
            [],
        )

        expect(rows.map((row) => row.name)).toEqual(['ad.mp4', 'Coffee ad', 'ad.mp4'])
    })

    it('tells a job recorded before its calls from one that never reached Gemini', () => {
        const rows = toJobRows(
            [jobWith(), jobWith({ id: 'j2', usage: {} }), jobWith({ id: 'j3', usage: undefined })],
            [],
        )

        expect(rows.map((row) => row.isUnrecorded)).toEqual([false, true, false])
        expect(rows[0].usage?.usd).toBeCloseTo(0.01043025, 10)
        expect(rows[1].usage).toBeUndefined()
    })

    it('gives each job its owner, and none to a job whose owner isn’t a user, like a demo', () => {
        const rows = toJobRows([jobWith(), jobWith({ id: 'j2', userId: 'demo' })], [userWith()])

        expect(rows.map((row) => row.user?.email)).toEqual(['ana@example.com', undefined])
    })
})

const userWith = (fields: Partial<AdminUser> = {}): AdminUser => ({
    id: 'u1',
    createdAt: '2026-09-30T10:00:00.000Z',
    email: 'ana@example.com',
    isAnonymous: false,
    emailVerified: true,
    isAdmin: false,
    ...fields,
})

describe('getUserType', () => {
    it('tells anonymous, unconfirmed, member and admin users apart, admin first', () => {
        expect(getUserType(userWith({ isAnonymous: true, email: null, emailVerified: false }))).toBe(
            AccountKind.Anonymous,
        )
        expect(getUserType(userWith({ emailVerified: false }))).toBe(AccountKind.Unconfirmed)
        expect(getUserType(userWith())).toBe(AccountKind.Member)
        expect(getUserType(userWith({ isAdmin: true, emailVerified: false }))).toBe(AccountKind.Admin)
    })
})

describe('toUserRows', () => {
    it('gives each user their type, job count and the summed cost of their priced jobs', () => {
        const rows = toUserRows(
            [userWith(), userWith({ id: 'u2', isAnonymous: true, email: null, emailVerified: false })],
            [
                jobWith(),
                jobWith({ id: 'j2', usage: undefined }),
                jobWith({ id: 'j3' }),
                jobWith({ id: 'j4', userId: 'u2', usage: undefined }),
            ],
        )

        expect(rows).toEqual([
            { user: userWith(), type: AccountKind.Member, jobs: 3, usd: expect.closeTo(0.0208605, 10) },
            { user: expect.objectContaining({ id: 'u2' }), type: AccountKind.Anonymous, jobs: 1, usd: undefined },
        ])
    })

    it('counts no jobs for a user who has none', () => {
        expect(toUserRows([userWith()], [jobWith({ userId: 'u2' })])).toEqual([
            { user: userWith(), type: AccountKind.Member, jobs: 0, usd: undefined },
        ])
    })
})

describe('formatTokenTally', () => {
    it('shows the tokens with thousands separators and their cost in brackets', () => {
        expect(formatTokenTally({ tokens: 12345, usd: 0.0123 })).toBe('12,345 ($0.012)')
        expect(formatTokenTally({ tokens: 750, usd: 0.0005625 })).toBe('750 ($0.0006)')
        expect(formatTokenTally({ tokens: 750, usd: undefined })).toBe('750 (—)')
    })
})
