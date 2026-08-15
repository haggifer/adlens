'use client'

import { ThunderboltOutlined } from '@ant-design/icons'
import { App, Button, Input, Select } from 'antd'
import useStyles from './styles'

const PLATFORM_OPTIONS = ['Meta', 'TikTok', 'YouTube', 'Instagram', 'Snapchat'].map((v) => ({ value: v, label: v }))

const OBJECTIVE_OPTIONS = ['Awareness', 'Consideration', 'Conversion'].map((v) => ({ value: v, label: v }))

const FOCUS_OPTIONS = ['Hook', 'Pacing', 'Messaging', 'CTA', 'Branding', 'Audio'].map((v) => ({ value: v, label: v }))

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Ukrainian'].map((v) => ({ value: v, label: v }))

export default function AnalysisSettings() {
    const { styles } = useStyles()
    const { message } = App.useApp()

    const runAnalysis = () => {
        message.info('Analysis isn’t wired up yet.')
    }

    return (
        <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Analysis settings</h2>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Platform</label>
                <Select placeholder="Where will it run?" options={PLATFORM_OPTIONS} allowClear />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Objective</label>
                <Select placeholder="Campaign goal" options={OBJECTIVE_OPTIONS} allowClear />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Target audience</label>
                <Input placeholder="e.g. Gen-Z gamers in the US" />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Brand context</label>
                <Input.TextArea placeholder="Anything AdLens should know about the brand or product" rows={3} />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Analysis focus</label>
                <Select mode="multiple" placeholder="What to look at" options={FOCUS_OPTIONS} allowClear />
            </div>
            <div className={styles.field}>
                <label className={styles.fieldLabel}>Output language</label>
                <Select placeholder="Report language" options={LANGUAGE_OPTIONS} defaultValue="English" />
            </div>
            <Button type="primary" size="large" block icon={<ThunderboltOutlined />} onClick={runAnalysis}>
                Run Analysis
            </Button>
        </div>
    )
}
