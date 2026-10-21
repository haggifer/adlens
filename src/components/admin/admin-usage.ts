import { AccountKind } from '@/auth/types'
import type { AdminJob, AdminModelCall, AdminUser } from 'adlens-shared'
import {
    formatCost,
    type GeminiCall,
    type GeminiCallCost,
    priceGeminiCall,
    splitCachedTokens,
    splitInputTokens,
} from './model-pricing'

export enum TokenKind {
    VideoInput = 'videoInput',
    AudioInput = 'audioInput',
    TextInput = 'textInput',
    OtherInput = 'otherInput',
    // The part of the input kinds above served from cache, at its cached cost.
    CachedInput = 'cachedInput',
    Thinking = 'thinking',
    Output = 'output',
}

// usd is undefined when a call's model is unpriced: a partial sum would understate the cost.
export interface TokenTally {
    tokens: number
    usd?: number
}

// durationMs is undefined when a call wasn't timed: a partial sum would understate the time.
export interface JobUsage {
    byKind: Record<TokenKind, TokenTally>
    usd?: number
    durationMs?: number
}

interface UserJobsSummary {
    jobs: number
    // Over the jobs that could be priced; undefined when none could.
    usd?: number
}

export interface AdminJobRow {
    job: AdminJob
    name: string
    // The job's owner; absent for a demo job (owned by `demo`) or a user deleted since.
    user?: AdminUser
    usage?: JobUsage
    // Has usage totals from before each call was recorded, so there's nothing to break down or price.
    isUnrecorded: boolean
    // Each model the job's recorded calls used, in call order; a retry may have run on another one.
    models: string[]
}

export interface AdminUserRow extends UserJobsSummary {
    user: AdminUser
    type: AccountKind
}

const INPUT_KINDS: Record<string, TokenKind> = {
    VIDEO: TokenKind.VideoInput,
    AUDIO: TokenKind.AudioInput,
    TEXT: TokenKind.TextInput,
}

const NO_TOKENS: TokenTally = { tokens: 0, usd: 0 }

const NO_USAGE: JobUsage = {
    byKind: {
        [TokenKind.VideoInput]: NO_TOKENS,
        [TokenKind.AudioInput]: NO_TOKENS,
        [TokenKind.TextInput]: NO_TOKENS,
        [TokenKind.OtherInput]: NO_TOKENS,
        [TokenKind.CachedInput]: NO_TOKENS,
        [TokenKind.Thinking]: NO_TOKENS,
        [TokenKind.Output]: NO_TOKENS,
    },
    usd: 0,
    durationMs: 0,
}

const NO_JOBS: UserJobsSummary = { jobs: 0 }

const addKnown = (a: number | undefined, b: number | undefined): number | undefined =>
    a === undefined || b === undefined ? undefined : a + b

const addTally = (tally: TokenTally, tokens: number, usd: number | undefined): TokenTally => ({
    tokens: tally.tokens + tokens,
    usd: addKnown(tally.usd, usd),
})

const getCachedTokens = (call: GeminiCall): number =>
    Object.values(call.cachedTokensByModality).reduce((sum, tokens) => sum + tokens, 0)

const toGeminiCall = (call: AdminModelCall): GeminiCall => ({
    model: call.model,
    location: call.location,
    at: call.at,
    inputTokensByModality: splitInputTokens(call.promptTokens, call.promptTokensByModality),
    cachedTokensByModality: splitCachedTokens(call.cachedTokens, call.cachedTokensByModality),
    thoughtsTokens: call.thoughtsTokens,
    candidatesTokens: call.candidatesTokens,
    trafficType: call.trafficType,
})

const addCallTallies = (
    byKind: JobUsage['byKind'],
    call: GeminiCall,
    cost: GeminiCallCost | undefined,
): JobUsage['byKind'] => {
    const tallies = { ...byKind }

    Object.entries(call.inputTokensByModality).forEach(([modality, tokens]) => {
        const kind = INPUT_KINDS[modality] ?? TokenKind.OtherInput

        tallies[kind] = addTally(tallies[kind], tokens, cost?.inputByModality[modality])
    })
    tallies[TokenKind.CachedInput] = addTally(tallies[TokenKind.CachedInput], getCachedTokens(call), cost?.cached)
    tallies[TokenKind.Thinking] = addTally(tallies[TokenKind.Thinking], call.thoughtsTokens, cost?.thinking)
    tallies[TokenKind.Output] = addTally(tallies[TokenKind.Output], call.candidatesTokens, cost?.output)

    return tallies
}

const addCall = (usage: JobUsage, call: AdminModelCall): JobUsage => {
    const geminiCall = toGeminiCall(call)
    const cost = priceGeminiCall(geminiCall)

    return {
        byKind: addCallTallies(usage.byKind, geminiCall, cost),
        usd: addKnown(usage.usd, cost?.total),
        durationMs: addKnown(usage.durationMs, call.durationMs),
    }
}

const addJob = (summary: UserJobsSummary, job: AdminJob): UserJobsSummary => {
    const usd = summarizeJobUsage(job)?.usd

    return { jobs: summary.jobs + 1, usd: usd === undefined ? summary.usd : (summary.usd ?? 0) + usd }
}

// undefined for a job without recorded calls: one that never reached Gemini or ran before calls were recorded.
export const summarizeJobUsage = (job: AdminJob): JobUsage | undefined => {
    const calls = job.usage?.calls

    if (!calls?.length) {
        return undefined
    }

    return calls.reduce(addCall, NO_USAGE)
}

export const hasOtherInput = (usages: (JobUsage | undefined)[]): boolean =>
    usages.some((usage) => Boolean(usage?.byKind[TokenKind.OtherInput].tokens))

const summarizeUserJobs = (jobs: AdminJob[]): Map<string, UserJobsSummary> =>
    jobs.reduce(
        (summaries, job) => summaries.set(job.userId, addJob(summaries.get(job.userId) ?? NO_JOBS, job)),
        new Map<string, UserJobsSummary>(),
    )

// Checks admin first, as the API grants access; the session's getAccountKind checks it last. Don't align the two.
export const getUserType = (user: AdminUser): AccountKind => {
    if (user.isAdmin) {
        return AccountKind.Admin
    }

    if (user.isAnonymous) {
        return AccountKind.Anonymous
    }

    return user.emailVerified ? AccountKind.Member : AccountKind.Unconfirmed
}

const getCallModels = (job: AdminJob): string[] => [...new Set((job.usage?.calls ?? []).map((call) => call.model))]

export const toJobRows = (jobs: AdminJob[], users: AdminUser[]): AdminJobRow[] => {
    const usersById = new Map(users.map((user) => [user.id, user]))

    return jobs.map((job) => ({
        job,
        name: job.sampleTitle ?? job.file.name,
        user: usersById.get(job.userId),
        usage: summarizeJobUsage(job),
        isUnrecorded: Boolean(job.usage) && !job.usage?.calls?.length,
        models: getCallModels(job),
    }))
}

export const toUserRows = (users: AdminUser[], jobs: AdminJob[]): AdminUserRow[] => {
    const summaries = summarizeUserJobs(jobs)

    return users.map((user) => ({
        user,
        type: getUserType(user),
        jobs: summaries.get(user.id)?.jobs ?? 0,
        usd: summaries.get(user.id)?.usd,
    }))
}

export const formatTokenTally = ({ tokens, usd }: TokenTally): string =>
    `${tokens.toLocaleString('en-US')} (${formatCost(usd)})`
