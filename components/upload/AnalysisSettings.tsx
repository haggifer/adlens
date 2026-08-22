'use client'

import { useState } from 'react'
import { DownOutlined, ThunderboltOutlined, UpOutlined } from '@ant-design/icons'
import { App, Button, Input, Select } from 'antd'
import { Controller, useForm } from 'react-hook-form'
import { useHarness } from '@/lib/design/harness/HarnessContext'
import useStyles from './styles'

const PLATFORM_OPTIONS = ['Meta', 'TikTok', 'YouTube'].map((v) => ({ value: v, label: v }))

const OBJECTIVE_OPTIONS = ['Conversion', 'Awareness', 'Consideration'].map((v) => ({ value: v, label: v }))

const FOCUS_OPTIONS = ['Hook', 'Pacing', 'Messaging', 'CTA', 'Branding', 'Audio'].map((v) => ({ value: v, label: v }))

interface AnalysisFormValues {
    platform: string[]
    objective: string
    focus: string[]
    audience: string
    brand: string
}

const DEFAULT_VALUES: AnalysisFormValues = {
    platform: [],
    objective: 'Conversion',
    focus: [],
    audience: '',
    brand: '',
}

export default function AnalysisSettings() {
    const { styles, cx } = useStyles()
    const { message } = App.useApp()
    const { runAccent } = useHarness()
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const { control, handleSubmit } = useForm<AnalysisFormValues>({ defaultValues: DEFAULT_VALUES })

    const onSubmit = (values: AnalysisFormValues) => {
        // TODO: wire up to the analysis backend.
        message.info(`Captured your settings (objective: ${values.objective}) — analysis isn’t wired up yet.`)
    }

    return (
        <form className={cx(styles.panel, styles.settingsPanel)} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={styles.panelTitle}>Tell us about your ad</h2>
            <div className={styles.settingsScroll}>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Platform</label>
                    <Controller
                        name="platform"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                mode="multiple"
                                placeholder="Where will it run?"
                                options={PLATFORM_OPTIONS}
                                allowClear
                            />
                        )}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Objective</label>
                    <Controller
                        name="objective"
                        control={control}
                        render={({ field }) => (
                            <Select {...field} placeholder="Campaign goal" options={OBJECTIVE_OPTIONS} allowClear />
                        )}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Analysis focus</label>
                    <Controller
                        name="focus"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                mode="multiple"
                                placeholder="Leave blank to analyze everything"
                                options={FOCUS_OPTIONS}
                                allowClear
                            />
                        )}
                    />
                </div>
                <Button
                    block
                    htmlType="button"
                    className={styles.advancedToggle}
                    icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setAdvancedOpen((open) => !open)}
                >
                    Advanced settings
                </Button>
                {advancedOpen && (
                    <>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Target audience</label>
                            <Controller
                                name="audience"
                                control={control}
                                render={({ field }) => <Input {...field} placeholder="e.g. Gen-Z gamers in the US" />}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Brand context</label>
                            <Controller
                                name="brand"
                                control={control}
                                render={({ field }) => (
                                    <Input.TextArea
                                        {...field}
                                        placeholder="Anything AdLens should know about the brand or product"
                                        rows={3}
                                    />
                                )}
                            />
                        </div>
                    </>
                )}
            </div>
            <Button
                type="primary"
                size="large"
                block
                htmlType="submit"
                className={styles.runButton}
                data-accent={runAccent}
                icon={<ThunderboltOutlined />}
            >
                Run Analysis
            </Button>
        </form>
    )
}
