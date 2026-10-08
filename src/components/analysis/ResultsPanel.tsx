'use client'

import { formatTopic, RULE_PLATFORM_LABELS } from '@/labels'
import { PlayCircleOutlined } from '@ant-design/icons'
import type { Advisory, Analysis, Finding, MetadataCheck, RulePlatform, Severity } from 'adlens-shared'
import { Alert, Button, Collapse, Tag, Tooltip } from 'antd'
import {
    countIssues,
    describeCheck,
    findingSeverity,
    formatCount,
    formatTimeRange,
    getCheckTargets,
    splitResults,
} from './results'
import { useStyles } from './styles'

const SEVERITY_COLORS: Record<Severity, string> = { blocker: 'red', warning: 'gold', info: 'blue' }

// Apart from every severity colour, so a placement or platform reads as where the ad runs, not as a judgement.
const TARGET_TAG_COLOR = 'purple'

// Labelled as the AI's own certainty, and in a colour apart from the severities and the placement tags, so it doesn't
// read as a second severity.
const CONFIDENCE_LABELS: Record<Finding['verdict'], string> = {
    fail: 'AI: sure',
    warning: 'AI: likely',
    unknown: 'AI: unsure',
}

const CONFIDENCE_TAG_COLOR = 'cyan'

const renderConfidenceTag = (verdict: Finding['verdict']) => (
    <Tooltip title="How sure the AI is that the video breaks this rule">
        <Tag color={CONFIDENCE_TAG_COLOR}>{CONFIDENCE_LABELS[verdict]}</Tag>
    </Tooltip>
)

// Specs are measured, not judged, so only one that couldn't be measured needs a mark.
const renderUnmeasuredTag = (verdict: MetadataCheck['verdict']) => verdict === 'unknown' && <Tag>couldn’t measure</Tag>

const renderPlatforms = (platforms: RulePlatform[]) => (
    <span>{platforms.map((platform) => RULE_PLATFORM_LABELS[platform]).join(', ')}</span>
)

interface IProps {
    analysis: Analysis
    onSeek?: (seconds: number) => void
}

export function ResultsPanel({ analysis, onSeek }: IProps) {
    const { styles } = useStyles()

    const { compliance, bestPractice, placementIssues } = splitResults(analysis)
    const { blockers, warnings } = countIssues(analysis)
    const { metadataChecks, advisories, transcript } = analysis

    const renderSource = (ref: string, quote: string) => (
        <a className={styles.sourceLink} href={ref} target="_blank" rel="noreferrer" title={quote}>
            Source ↗
        </a>
    )

    const renderFinding = (finding: Finding) => {
        const { time } = finding
        const severity = findingSeverity(finding)

        return (
            <div key={finding.id} className={styles.findingCard}>
                <div className={styles.findingHead}>
                    <Tag color={SEVERITY_COLORS[severity]}>{severity}</Tag>
                    {renderConfidenceTag(finding.verdict)}
                    <span className={styles.findingTopic}>{formatTopic(finding.topic)}</span>
                </div>
                <p className={styles.findingEvidence}>{finding.evidence}</p>
                <div className={styles.findingFooter}>
                    {time && (
                        <Button
                            type="link"
                            size="small"
                            className={styles.timeButton}
                            icon={<PlayCircleOutlined />}
                            onClick={() => onSeek?.(time.startS)}
                            aria-label={`Play from ${formatTimeRange(time)}`}
                        >
                            {formatTimeRange(time)}
                        </Button>
                    )}
                    {renderPlatforms(finding.platform)}
                    {renderSource(finding.ref, finding.quote)}
                </div>
            </div>
        )
    }

    const renderCheck = (check: MetadataCheck) => (
        <div key={check.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                {getCheckTargets(check).map((target) => (
                    <Tag key={target} color={TARGET_TAG_COLOR}>
                        {target}
                    </Tag>
                ))}
                <Tag color={SEVERITY_COLORS[check.severity]}>{check.severity}</Tag>
                {renderUnmeasuredTag(check.verdict)}
                <span className={styles.findingTopic}>{check.check ?? formatTopic(check.topic)}</span>
            </div>
            <p className={styles.findingEvidence}>{describeCheck(check)}</p>
            <div className={styles.findingFooter}>{renderSource(check.ref, check.quote)}</div>
        </div>
    )

    const renderAdvisory = (advisory: Advisory) => (
        <div key={advisory.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                <Tag color={SEVERITY_COLORS[advisory.severity]}>{advisory.severity}</Tag>
                <span className={styles.findingTopic}>{formatTopic(advisory.topic)}</span>
            </div>
            <p className={styles.findingEvidence}>{advisory.check}</p>
            <div className={styles.findingFooter}>
                {renderPlatforms(advisory.platform)}
                {renderSource(advisory.ref, advisory.quote)}
            </div>
        </div>
    )

    return (
        <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Results</h2>
            {blockers + warnings + advisories.length > 0 && (
                <div className={styles.summaryRow}>
                    {blockers > 0 && <Tag color="red">{formatCount(blockers, 'blocker', 'blockers')}</Tag>}
                    {warnings > 0 && <Tag color="gold">{formatCount(warnings, 'warning', 'warnings')}</Tag>}
                    {advisories.length > 0 && <Tag color="blue">{advisories.length} to confirm</Tag>}
                </div>
            )}
            <div className={styles.resultsScroll}>
                <Collapse
                    size="small"
                    items={[
                        {
                            key: 'transcript',
                            label: 'Transcript',
                            children: <p className={styles.transcriptText}>{transcript || 'No speech detected.'}</p>,
                        },
                    ]}
                />
                <h3 className={styles.sectionLabel}>Will it be approved?</h3>
                {compliance.length ? (
                    compliance.map(renderFinding)
                ) : (
                    <Alert type="success" showIcon title="No policy risks found." />
                )}
                <h3 className={styles.sectionLabel}>What’s holding it back?</h3>
                {bestPractice.length ? (
                    bestPractice.map(renderFinding)
                ) : (
                    <Alert type="success" showIcon title="No gaps against the platforms’ best practices." />
                )}
                {metadataChecks.length > 0 && (
                    <>
                        <h3 className={styles.sectionLabel}>Placement specs</h3>
                        {placementIssues.length ? (
                            placementIssues.map(renderCheck)
                        ) : (
                            <Alert type="success" showIcon title="No placement spec issues found." />
                        )}
                    </>
                )}
                {advisories.length > 0 && (
                    <>
                        <h3 className={styles.sectionLabel}>Confirm in your campaign setup</h3>
                        <p className={styles.hint}>These rules depend on targeting or paperwork, not on the video.</p>
                        {advisories.map(renderAdvisory)}
                    </>
                )}
            </div>
        </div>
    )
}
