'use client'

import { useAuth } from '@/auth/AuthContext'
import { usePresets } from '@/hooks/usePresets'
import { PlusOutlined } from '@ant-design/icons'
import { MAX_PRESETS } from 'adlens-shared'
import { Alert, Button, Empty, Spin, Tooltip } from 'antd'
import { useState } from 'react'
import { PresetModal } from './PresetModal'
import { PresetsTable } from './PresetsTable'
import { useStyles } from './styles'

const LIMIT_TOOLTIP = `You can keep up to ${MAX_PRESETS} presets`

// No PrivateRoute: a visitor without a session sees the empty state, and creating a preset starts the session.
export function PresetsView() {
    const { styles } = useStyles()
    const { isInitializing } = useAuth()

    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const { presets, isLoading, error } = usePresets()

    const isAtLimit = presets.length >= MAX_PRESETS

    const handleCreate = () => setIsCreateOpen(true)

    if (isInitializing) {
        return (
            <div className={styles.gate}>
                <Spin size="large" />
            </div>
        )
    }

    const createButton = (
        <Button type="primary" icon={<PlusOutlined />} disabled={isAtLimit} onClick={handleCreate}>
            Create
        </Button>
    )

    return (
        <section className={styles.page}>
            <div className={styles.titleRow}>
                <h1 className={styles.pageTitle}>Presets</h1>
                {isAtLimit ? (
                    <Tooltip title={LIMIT_TOOLTIP}>
                        <span>{createButton}</span>
                    </Tooltip>
                ) : (
                    createButton
                )}
            </div>
            {error && <Alert type="error" showIcon title={error.message} />}
            <PresetsTable
                presets={presets}
                isLoading={isLoading}
                emptyText={
                    // A failed load says nothing about whether the user has presets; the alert above explains it.
                    error ? null : (
                        <Empty description="No presets yet">
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                                Create
                            </Button>
                        </Empty>
                    )
                }
            />
            <PresetModal isOpen={isCreateOpen} title="Create preset" onClose={() => setIsCreateOpen(false)} />
        </section>
    )
}
