import { formatCost, type GeminiCall, priceGeminiCall, splitCachedTokens, splitInputTokens } from './model-pricing'

// The same run as one recorded call.
const CALL: GeminiCall = {
    model: 'gemini-3.6-flash',
    location: 'global',
    at: '2026-09-29T10:00:00.000Z',
    inputTokensByModality: { AUDIO: 750, VIDEO: 1980, TEXT: 5717 },
    cachedTokensByModality: {},
    thoughtsTokens: 965,
    candidatesTokens: 127,
}

describe('priceGeminiCall', () => {
    it('prices every input modality at the input rate and thinking and output at the output rate', () => {
        const cost = priceGeminiCall(CALL)

        expect(cost?.inputByModality).toEqual({
            AUDIO: expect.closeTo(0.0005625, 10),
            VIDEO: expect.closeTo(0.001485, 10),
            TEXT: expect.closeTo(0.00428775, 10),
        })
        expect(cost?.thinking).toBeCloseTo(0.00361875, 10)
        expect(cost?.output).toBeCloseTo(0.00047625, 10)
        expect(cost?.cached).toBe(0)
        expect(cost?.total).toBeCloseTo(0.01043025, 10)
    })

    it('prices cached input tokens at 10% of the input rate, within the modality’s input cost', () => {
        const cost = priceGeminiCall({ ...CALL, cachedTokensByModality: { TEXT: 4000 } })

        // (1,717 + 4,000 × 10%) × $0.75 per million.
        expect(cost?.inputByModality.TEXT).toBeCloseTo(0.00158775, 10)
        expect(cost?.inputByModality.VIDEO).toBeCloseTo(0.001485, 10)
        // 4,000 × $0.075 per million.
        expect(cost?.cached).toBeCloseTo(0.0003, 10)
        expect(cost?.total).toBeCloseTo(0.00773025, 10)
    })

    it('prices each cached modality at 10% of that modality’s rate', () => {
        const cost = priceGeminiCall({
            ...CALL,
            model: 'gemini-3.1-flash-lite',
            cachedTokensByModality: { AUDIO: 750, TEXT: 5000 },
        })

        // 750 × $0.05 and (717 + 5,000 × 10%) × $0.25, per million.
        expect(cost?.inputByModality.AUDIO).toBeCloseTo(0.0000375, 10)
        expect(cost?.inputByModality.TEXT).toBeCloseTo(0.00030425, 10)
        // 750 × $0.05 + 5,000 × $0.025, per million.
        expect(cost?.cached).toBeCloseTo(0.0001625, 10)
    })

    it('never counts more of a modality as cached than its input tokens', () => {
        const cost = priceGeminiCall({ ...CALL, cachedTokensByModality: { VIDEO: 5000 } })

        expect(cost?.inputByModality.VIDEO).toBeCloseTo(0.0001485, 10)
        expect(cost?.cached).toBeCloseTo(0.0001485, 10)
    })

    it('adds the non-global markup to cached tokens too', () => {
        const cost = priceGeminiCall({ ...CALL, location: 'europe-west1', cachedTokensByModality: { TEXT: 4000 } })

        expect(cost?.cached).toBeCloseTo(0.00033, 10)
    })

    it('prices audio at the audio rate where the model has one', () => {
        const cost = priceGeminiCall({ ...CALL, model: 'gemini-3.1-flash-lite' })

        expect(cost?.inputByModality.AUDIO).toBeCloseTo(0.000375, 10)
        expect(cost?.inputByModality.VIDEO).toBeCloseTo(0.000495, 10)
        expect(cost?.total).toBeCloseTo(0.00393725, 10)
    })

    it('uses the standard rate from 2027 and adds 10% outside the global endpoint', () => {
        expect(priceGeminiCall({ ...CALL, at: '2027-01-02T00:00:00.000Z' })?.total).toBeCloseTo(0.0208605, 10)
        expect(priceGeminiCall({ ...CALL, location: 'europe-west1' })?.thinking).toBeCloseTo(0.003980625, 10)
    })

    it('prices Gemini 4 Argon at its promotional rate through November 2026 and its list rate from December', () => {
        const argon = { ...CALL, model: 'gemini-4-argon', at: '2026-11-30T23:59:00.000Z' }

        // 8,447 input tokens × $2 + 1,092 output and thinking tokens × $10, per million.
        expect(priceGeminiCall(argon)?.total).toBeCloseTo(0.027814, 10)
        expect(priceGeminiCall({ ...argon, at: '2026-12-01T00:00:00.000Z' })?.total).toBeCloseTo(0.055628, 10)
    })

    it('prices Gemini 4 Argon cached input at 5% of the input rate', () => {
        const cost = priceGeminiCall({ ...CALL, model: 'gemini-4-argon', cachedTokensByModality: { TEXT: 4000 } })

        // (1,717 + 4,000 × 5%) × $2 and 4,000 × $0.1, per million.
        expect(cost?.inputByModality.TEXT).toBeCloseTo(0.003834, 10)
        expect(cost?.cached).toBeCloseTo(0.0004, 10)
    })

    it('prices a Flex call at half of every line, cached input included', () => {
        const flex = priceGeminiCall({ ...CALL, trafficType: 'ON_DEMAND_FLEX', cachedTokensByModality: { TEXT: 4000 } })

        expect(flex?.cached).toBeCloseTo(0.00015, 10)
        expect(flex?.thinking).toBeCloseTo(0.001809375, 10)
        expect(flex?.total).toBeCloseTo(0.003865125, 10)
        expect(priceGeminiCall({ ...CALL, trafficType: 'ON_DEMAND' })?.total).toBeCloseTo(0.01043025, 10)
    })

    it('gives no price for an unknown model', () => {
        expect(priceGeminiCall({ ...CALL, model: 'some-future-model' })).toBeUndefined()
    })
})

describe('splitInputTokens', () => {
    it('files the input tokens no modality accounts for as unspecified', () => {
        expect(splitInputTokens(100, { VIDEO: 60, TEXT: 30 })).toEqual({
            VIDEO: 60,
            TEXT: 30,
            MODALITY_UNSPECIFIED: 10,
        })
        expect(splitInputTokens(90, { VIDEO: 60, TEXT: 30 })).toEqual({ VIDEO: 60, TEXT: 30 })
        expect(splitInputTokens(100, {})).toEqual({ MODALITY_UNSPECIFIED: 100 })
    })
})

describe('splitCachedTokens', () => {
    it('counts the cached tokens no modality accounts for as text', () => {
        expect(splitCachedTokens(500, {})).toEqual({ TEXT: 500 })
        expect(splitCachedTokens(500, { VIDEO: 300 })).toEqual({ VIDEO: 300, TEXT: 200 })
        expect(splitCachedTokens(500, { VIDEO: 300, TEXT: 200 })).toEqual({ VIDEO: 300, TEXT: 200 })
        expect(splitCachedTokens(0, {})).toEqual({})
    })
})

describe('formatCost', () => {
    it('shows fractions of a cent with four decimals and larger amounts with three', () => {
        expect(formatCost(0.0043)).toBe('$0.0043')
        expect(formatCost(0.0208605)).toBe('$0.021')
        expect(formatCost(undefined)).toBe('—')
    })
})
