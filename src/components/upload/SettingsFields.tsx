'use client'

import { formatPlacementLabel, MARKET_LABELS, PLATFORM_LABELS } from '@/labels'
import { type AnalysisSettingsInput, Market, type Placement, Platform } from 'adlens-shared'
import { Select } from 'antd'
import { getPlatformPlacements, toPlacementsForPlatforms, toPlatformsForPlacements } from './platform-placements'
import { useStyles } from './styles'

const PLATFORM_OPTIONS = Object.values(Platform).map((value) => ({ value, label: PLATFORM_LABELS[value] }))

const MARKET_OPTIONS = Object.values(Market).map((value) => ({ value, label: MARKET_LABELS[value] }))

const getPlacementOptions = (platforms: Platform[]) =>
    platforms.map((platform) => ({
        label: PLATFORM_LABELS[platform],
        options: getPlatformPlacements(platform).map((value) => ({ value, label: formatPlacementLabel(value) })),
    }))

interface IProps {
    value: AnalysisSettingsInput
    // Always the complete next settings, with platforms and placements already linked.
    onChange: (next: AnalysisSettingsInput) => void
    isDisabled?: boolean
}

export function SettingsFields({ value, onChange, isDisabled }: IProps) {
    const { styles } = useStyles()

    const platforms = value.platforms ?? []
    const placements = value.placements ?? []
    const markets = value.markets ?? []

    const handlePlatformsChange = (next: Platform[]) =>
        onChange({ ...value, platforms: next, placements: toPlacementsForPlatforms(placements, platforms, next) })

    const handlePlacementsChange = (next: Placement[]) =>
        onChange({ ...value, placements: next, platforms: toPlatformsForPlacements(platforms, next) })

    const handleMarketsChange = (next: Market[]) => onChange({ ...value, markets: next })

    return (
        <>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Platforms</label>
                <Select
                    value={platforms}
                    onChange={handlePlatformsChange}
                    mode="multiple"
                    // No search box: the lists are short, and on a phone tapping one opens the keyboard.
                    showSearch={false}
                    placeholder="Leave empty to check every platform"
                    options={PLATFORM_OPTIONS}
                    disabled={isDisabled}
                    allowClear
                />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Placements</label>
                <Select
                    value={placements}
                    onChange={handlePlacementsChange}
                    mode="multiple"
                    showSearch={false}
                    // Seen only with no platform chosen, since a chosen platform keeps at least one
                    // placement. Nothing chosen is checked as everything (the API resolves it in full).
                    placeholder="Every placement is checked; pick a platform to narrow"
                    options={getPlacementOptions(platforms)}
                    disabled={!platforms.length || isDisabled}
                    allowClear
                />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Markets</label>
                <Select
                    value={markets}
                    onChange={handleMarketsChange}
                    mode="multiple"
                    showSearch={false}
                    placeholder="Leave empty to check every market"
                    options={MARKET_OPTIONS}
                    disabled={isDisabled}
                    allowClear
                />
            </div>
        </>
    )
}
