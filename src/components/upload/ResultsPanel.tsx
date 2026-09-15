'use client'

import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Collapse, Empty, Tag } from 'antd'
import type { Advisory, Analysis, Finding, MetadataCheck } from 'adlens-shared'
import { useStyles } from './styles'

const SEVERITY_ORDER: Record<Finding['severity'], number> = { blocker: 0, warning: 1, info: 2 }

const SEVERITY_COLOR: Record<Finding['severity'], string> = { blocker: 'red', warning: 'gold', info: 'blue' }

const VERDICT_COLOR: Record<string, string> = { fail: 'red', warning: 'gold', unknown: 'default', pass: 'green' }

const bySeverity = (a: Finding, b: Finding) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]

interface IProps {
    analysis: Analysis
    onReset: () => void
}

export default function ResultsPanel({ analysis, onReset }: IProps) {
    const { styles } = useStyles()
    const { findings, metadataChecks, advisories, transcript } = analysis

    const sortedFindings = [...findings].sort(bySeverity)
    const failedChecks = metadataChecks.filter((c) => c.verdict !== 'pass')
    const blockerCount = findings.filter((f) => f.severity === 'blocker').length
    const warningCount = findings.filter((f) => f.severity === 'warning').length
    const hasIssues = findings.length > 0 || failedChecks.some((c) => c.verdict === 'fail')

    const renderFinding = (finding: Finding) => (
        <div key={finding.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                <Tag color={SEVERITY_COLOR[finding.severity]}>{finding.severity}</Tag>
                <Tag color={VERDICT_COLOR[finding.verdict]}>{finding.verdict}</Tag>
                <span className={styles.findingTopic}>{finding.topic}</span>
            </div>
            <p className={styles.findingEvidence}>{finding.evidence}</p>
            <span className={styles.findingMeta}>
                {finding.platform.join(', ')}
                {finding.timestamp ? ` · ${finding.timestamp}` : ''}
            </span>
            <a className={styles.sourceLink} href={finding.ref} target="_blank" rel="noreferrer" title={finding.quote}>
                Policy source ↗
            </a>
        </div>
    )

    const renderCheck = (check: MetadataCheck) => (
        <div key={check.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                <Tag color={SEVERITY_COLOR[check.severity]}>{check.severity}</Tag>
                <Tag color={VERDICT_COLOR[check.verdict]}>{check.verdict}</Tag>
                <span className={styles.findingTopic}>{check.topic}</span>
            </div>
            <p className={styles.findingEvidence}>{check.detail}</p>
            <a className={styles.sourceLink} href={check.ref} target="_blank" rel="noreferrer" title={check.quote}>
                Policy source ↗
            </a>
        </div>
    )

    const renderAdvisory = (advisory: Advisory) => (
        <div key={advisory.id} className={styles.findingCard}>
            <div className={styles.findingHead}>
                <Tag color={SEVERITY_COLOR[advisory.severity]}>{advisory.severity}</Tag>
                <span className={styles.findingTopic}>{advisory.topic}</span>
            </div>
            <p className={styles.findingEvidence}>{advisory.check}</p>
            <a className={styles.sourceLink} href={advisory.ref} target="_blank" rel="noreferrer" title={advisory.quote}>
                Policy source ↗
            </a>
        </div>
    )

    return (
        <div className={styles.panel} style={{ height: '100%' }}>
            <div className="d-flex align-items-center justify-content-between">
                <h2 className={styles.panelTitle}>Analysis results</h2>
                <Button type="link" icon={<ReloadOutlined />} onClick={onReset}>
                    New analysis
                </Button>
            </div>
            <div className={styles.summaryRow}>
                <Tag color={blockerCount ? 'red' : 'green'}>{blockerCount} blockers</Tag>
                <Tag color={warningCount ? 'gold' : 'default'}>{warningCount} warnings</Tag>
                <Tag color="blue">{advisories.length} advisories</Tag>
            </div>
            <div className={styles.resultsScroll}>
                {!hasIssues && (
                    <Alert type="success" showIcon message="No policy issues detected in the creative." />
                )}
                {sortedFindings.length > 0 && (
                    <>
                        <h3 className={styles.sectionLabel}>Policy findings</h3>
                        {sortedFindings.map(renderFinding)}
                    </>
                )}
                {failedChecks.length > 0 && (
                    <>
                        <h3 className={styles.sectionLabel}>Creative specs</h3>
                        {failedChecks.map(renderCheck)}
                    </>
                )}
                {advisories.length > 0 && (
                    <>
                        <h3 className={styles.sectionLabel}>Advisory checklist</h3>
                        <Alert
                            type="info"
                            showIcon
                            message="These can't be verified from the video — confirm them in your campaign setup."
                        />
                        {advisories.map(renderAdvisory)}
                    </>
                )}
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
                {findings.length === 0 && metadataChecks.length === 0 && advisories.length === 0 && (
                    <Empty description="No rules applied for this configuration." />
                )}
            </div>
        </div>
    )
}
