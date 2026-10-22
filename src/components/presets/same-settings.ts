import type { AnalysisSettingsInput } from 'adlens-shared'

const isSameSet = (a: readonly string[] = [], b: readonly string[] = []) =>
    a.length === b.length && a.every((value) => b.includes(value))

// The API's rule for counting a run towards a preset, so the panel marks a preset as selected exactly when its run
// would count: the same values in each field, in any order. The form leaves an untouched field out, which counts as empty.
export const isSameSettings = (a: AnalysisSettingsInput, b: AnalysisSettingsInput): boolean =>
    isSameSet(a.platforms, b.platforms) && isSameSet(a.placements, b.placements) && isSameSet(a.markets, b.markets)

// Nothing chosen: a preset of it would only stand for "check everything", which no settings at all already do, so
// nothing offers to save one.
export const isEmptySettings = ({ platforms = [], placements = [], markets = [] }: AnalysisSettingsInput): boolean =>
    !platforms.length && !placements.length && !markets.length
