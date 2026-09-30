'use client'

import { PlayCircleOutlined } from '@ant-design/icons'
import type { Advisory, Analysis, Finding, MetadataCheck, Severity } from 'adlens-shared'
import { Alert, Button, Collapse, Tag } from 'antd'
import { RULE_PLATFORM_LABELS } from '@/labels'
import { countIssues, findingSeverity, formatCount, formatTimeRange, splitResults } from './results'
import { useStyles } from './styles'

const SEVERITY_COLORS: Record<Severity, string> = { blocker: 'red', warning: 'gold', info: 'blue' }

const VERDICT_COLORS: Record<Finding['verdict'] | MetadataCheck['verdict'], string> = {
    fail: 'red',
    warning: 'gold',
    unknown: 'default',
    pass: 'green',
}

const VERDICT_LABELS: Record<Finding['verdict'] | MetadataCheck['verdict'], string> = {
    fail: 'fails',
    warning: 'at risk',
    unknown: 'couldn’t check',
    pass: 'passes',
}

interface IProps {
    analysis: Analysis
    onSeek?: (seconds: number) => void
}

export function ResultsPanel({ analysis, onSeek }: IProps) {
    const { styles } = useStyles()
    const { compliance, bestPractice, placementIssues, passedChecks } = splitResults(analysis)
    const { blockers, warnings } = countIssues(analysis)
    const { advisories, transcript } = analysis

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
                    <Tag color={VERDICT_COLORS[finding.verdict]}>{VERDICT_LABELS[finding.verdict]}</Tag>
                    <span className={styles.findingTopic}>{finding.topic}</span>
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
                    <span>{finding.platform.map((platform) => RULE_PLATFORM_LABELS[platform]).join(', ')}</span>
                    {renderSource(finding.ref, finding.quote)}
                </div>
            </div>
        )
    }

    const renderCheck = (check: MetadataCheck) => (
        <div key={check.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                <Tag color={SEVERITY_COLORS[check.severity]}>{check.severity}</Tag>
                <Tag color={VERDICT_COLORS[check.verdict]}>{VERDICT_LABELS[check.verdict]}</Tag>
                <span className={styles.findingTopic}>{check.topic}</span>
            </div>
            <p className={styles.findingEvidence}>{check.detail}</p>
            <div className={styles.findingFooter}>{renderSource(check.ref, check.quote)}</div>
        </div>
    )

    const renderAdvisory = (advisory: Advisory) => (
        <div key={advisory.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                <Tag color={SEVERITY_COLORS[advisory.severity]}>{advisory.severity}</Tag>
                <span className={styles.findingTopic}>{advisory.topic}</span>
            </div>
            <p className={styles.findingEvidence}>{advisory.check}</p>
            <div className={styles.findingFooter}>{renderSource(advisory.ref, advisory.quote)}</div>
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
                {(placementIssues.length > 0 || passedChecks > 0) && (
                    <>
                        <h3 className={styles.sectionLabel}>Placement specs</h3>
                        {placementIssues.map(renderCheck)}
                        {passedChecks > 0 && (
                            <p className={styles.hint}>
                                {passedChecks} {passedChecks === 1 ? 'spec passes' : 'specs pass'}.
                            </p>
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
                <Collapse
                    className="mt-2"
                    size="small"
                    items={[
                        {
                            key: 'transcript',
                            label: 'Transcript',
                            children: <p className={styles.transcriptText}>{transcript || 'No speech detected.'}</p>,
                        },
                    ]}
                />
            </div>
        </div>
    )
}
