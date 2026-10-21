// Vertex AI standard on-demand prices in USD per 1M tokens (prompts up to 200K tokens), from
// https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing, checked 2026-09-29 (Gemini 4 Argon
// 2026-10-21). Thinking tokens bill as output, input served from Vertex's implicit cache at 10% of its modality's input
// rate (5% on Argon), and a Flex PayGo call at half of all that (checked 2026-10-05). An estimate: the >200K tier and
// Priority pricing aren't modelled.

interface Rates {
    input: number
    // Only where the model prices audio input apart from text, image and video.
    audioInput?: number
    output: number
}

interface IntroductoryPricing {
    rates: Rates
    // Epoch milliseconds; calls from then on pay the standard rates.
    until: number
}

interface ModelPricing {
    standard: Rates
    introductory?: IntroductoryPricing
    // The share of its modality's input rate a cached token costs, when not CACHED_INPUT_SHARE.
    cachedInputShare?: number
}

export interface GeminiCall {
    model: string
    location: string
    // When it ran (ISO), which decides introductory pricing.
    at: string
    inputTokensByModality: Record<string, number>
    cachedTokensByModality: Record<string, number>
    thoughtsTokens: number
    candidatesTokens: number
    trafficType?: string
}

// In USD, by the same kinds as the call's tokens.
export interface GeminiCallCost {
    inputByModality: Record<string, number>
    // What the cached tokens cost, already part of inputByModality.
    cached: number
    thinking: number
    output: number
    total: number
}

// Every model on the price list costs 10% more outside the global endpoint.
const NON_GLOBAL_MARKUP = 1.1
const CACHED_INPUT_SHARE = 0.1
const FLEX_TRAFFIC_TYPE = 'ON_DEMAND_FLEX'
const FLEX_SHARE = 0.5
const PER_TOKEN = 1 / 1_000_000

const FLASH_3_6_PLUS: ModelPricing = {
    standard: { input: 1.5, output: 7.5 },
    introductory: { rates: { input: 0.75, output: 3.75 }, until: Date.parse('2027-01-01T00:00:00Z') },
}

const PRICING: Record<string, ModelPricing> = {
    // The introductory rates are the list price less Google's 50% promotional credit, through 2026-11-30.
    'gemini-4-argon': {
        standard: { input: 4, output: 20 },
        introductory: { rates: { input: 2, output: 10 }, until: Date.parse('2026-12-01T00:00:00Z') },
        cachedInputShare: 0.05,
    },
    'gemini-3.6-flash': FLASH_3_6_PLUS,
    'gemini-3.7-flash': FLASH_3_6_PLUS,
    'gemini-3.8-flash': FLASH_3_6_PLUS,
    'gemini-3.5-flash': { standard: { input: 1.5, output: 9 } },
    'gemini-3.5-flash-lite': { standard: { input: 0.3, output: 2.5 } },
    'gemini-3.1-flash-lite': { standard: { input: 0.25, audioInput: 0.5, output: 1.5 } },
    'gemini-3.1-pro-preview': { standard: { input: 2, output: 12 } },
}

// Gemini's name for input it doesn't attribute to a modality, priced at the plain input rate.
const UNSPECIFIED_MODALITY = 'MODALITY_UNSPECIFIED'
const TEXT_MODALITY = 'TEXT'

const sumValues = (record: Record<string, number>): number =>
    Object.values(record).reduce((sum, value) => sum + value, 0)

const getRates = ({ standard, introductory }: ModelPricing, at: string): Rates =>
    introductory && Date.parse(at) < introductory.until ? introductory.rates : standard

const getLocationFactor = (location: string): number => (location === 'global' ? 1 : NON_GLOBAL_MARKUP)

const getTrafficFactor = (trafficType: string | undefined): number =>
    trafficType === FLEX_TRAFFIC_TYPE ? FLEX_SHARE : 1

const getInputRate = (modality: string, rates: Rates): number =>
    modality === 'AUDIO' ? (rates.audioInput ?? rates.input) : rates.input

// Capped at the modality's input tokens, since cached tokens are a part of them.
const getCachedTokens = (call: GeminiCall, modality: string): number =>
    Math.min(call.cachedTokensByModality[modality] ?? 0, call.inputTokensByModality[modality] ?? 0)

// The modality's input tokens at the full rate, cached ones counting as their share.
const getBilledInputTokens = (call: GeminiCall, modality: string, cachedShare: number): number =>
    call.inputTokensByModality[modality] - getCachedTokens(call, modality) * (1 - cachedShare)

const priceInputByModality = (
    call: GeminiCall,
    rates: Rates,
    cachedShare: number,
    perToken: number,
): Record<string, number> =>
    Object.fromEntries(
        Object.keys(call.inputTokensByModality).map((modality) => [
            modality,
            getBilledInputTokens(call, modality, cachedShare) * getInputRate(modality, rates) * perToken,
        ]),
    )

const priceCachedInput = (call: GeminiCall, rates: Rates, cachedShare: number, perToken: number): number =>
    Object.keys(call.inputTokensByModality).reduce(
        (sum, modality) =>
            sum + getCachedTokens(call, modality) * getInputRate(modality, rates) * cachedShare * perToken,
        0,
    )

// Adds the input tokens the per-modality counts don't account for (or all of them, without a breakdown).
export const splitInputTokens = (promptTokens: number, byModality: Record<string, number>): Record<string, number> => {
    const rest = promptTokens - sumValues(byModality)

    return rest > 0 ? { ...byModality, [UNSPECIFIED_MODALITY]: rest } : byModality
}

// Counts the cached tokens the per-modality counts don't account for (or all of them, without a breakdown) as text.
export const splitCachedTokens = (cachedTokens: number, byModality: Record<string, number>): Record<string, number> => {
    const rest = cachedTokens - sumValues(byModality)

    return rest > 0 ? { ...byModality, [TEXT_MODALITY]: (byModality[TEXT_MODALITY] ?? 0) + rest } : byModality
}

export const priceGeminiCall = (call: GeminiCall): GeminiCallCost | undefined => {
    const pricing = PRICING[call.model]

    if (!pricing) {
        return undefined
    }

    const rates = getRates(pricing, call.at)
    const cachedShare = pricing.cachedInputShare ?? CACHED_INPUT_SHARE
    const perToken = PER_TOKEN * getLocationFactor(call.location) * getTrafficFactor(call.trafficType)
    const inputByModality = priceInputByModality(call, rates, cachedShare, perToken)
    const input = sumValues(inputByModality)
    const cached = priceCachedInput(call, rates, cachedShare, perToken)
    const thinking = call.thoughtsTokens * rates.output * perToken
    const output = call.candidatesTokens * rates.output * perToken

    return { inputByModality, cached, thinking, output, total: input + thinking + output }
}

export const formatCost = (usd: number | undefined): string => {
    if (usd === undefined) {
        return '—'
    }

    return `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}`
}
