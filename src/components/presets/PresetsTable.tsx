'use client'

import { describePresetError } from '@/api/errors'
import { ButtonTooltip } from '@/components/utils/ButtonTooltip'
import { MODAL_WIDTH } from '@/design/theme'
import { useDeletePreset } from '@/hooks/useDeletePreset'
import { useSetDefaultPreset } from '@/hooks/useSetDefaultPreset'
import { DeleteOutlined, EditOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import type { Preset } from 'adlens-shared'
import { App, Button, Table, type TableColumnsType } from 'antd'
import { type ReactNode, useState } from 'react'
import { PresetModal } from './PresetModal'
import { useStyles } from './styles'
import { formatUsage } from './usage-label'

interface IActionsProps {
    preset: Preset
    onEdit: (preset: Preset) => void
}

const PresetRowActions = ({ preset, onEdit }: IActionsProps) => {
    const { modal, notification } = App.useApp()

    const { deletePreset } = useDeletePreset()
    const { setDefaultPreset, isSetting } = useSetDefaultPreset()

    const showError = (error: unknown) => {
        console.error(error)
        notification.error({ title: describePresetError(error), placement: 'bottomRight' })
    }

    const handleToggleDefault = async () => {
        try {
            await setDefaultPreset(preset.isDefault ? null : preset.id)
        } catch (error) {
            showError(error)
        }
    }

    const handleDelete = async () => {
        try {
            await deletePreset(preset.id)
            notification.success({ title: 'Preset deleted', placement: 'bottomRight' })
        } catch (error) {
            showError(error)
        }
    }

    const handleDeleteClick = () => {
        modal.confirm({
            title: 'Delete this preset?',
            width: MODAL_WIDTH,
            content: `“${preset.name}” will be deleted. Analyses already run with it keep its name in your history.`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: handleDelete,
        })
    }

    return (
        <div className="d-flex justify-content-end gap-1">
            <ButtonTooltip title={preset.isDefault ? 'Default, click to unset' : 'Make default'}>
                <Button
                    type={preset.isDefault ? 'primary' : 'text'}
                    icon={preset.isDefault ? <StarFilled /> : <StarOutlined />}
                    aria-label={
                        preset.isDefault
                            ? `${preset.name} is the default, click to unset`
                            : `Make ${preset.name} the default`
                    }
                    aria-pressed={preset.isDefault}
                    loading={isSetting}
                    onClick={handleToggleDefault}
                />
            </ButtonTooltip>
            <ButtonTooltip title="Edit">
                <Button
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={`Edit ${preset.name}`}
                    onClick={() => onEdit(preset)}
                />
            </ButtonTooltip>
            <ButtonTooltip title="Delete">
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Delete ${preset.name}`}
                    onClick={handleDeleteClick}
                />
            </ButtonTooltip>
        </div>
    )
}

const getColumns = (
    styles: ReturnType<typeof useStyles>['styles'],
    onEdit: (preset: Preset) => void,
): TableColumnsType<Preset> => [
    {
        title: 'Name',
        key: 'name',
        render: (_, preset) => (
            <div className={styles.nameCell}>
                <span className={styles.name} title={preset.name}>
                    {preset.name}
                </span>
                {/* Phones drop the Usages column, so the row carries it under the name. */}
                <span className={styles.compactMeta}>{formatUsage(preset.usageCount)}</span>
            </div>
        ),
    },
    {
        title: 'Usages',
        key: 'usageCount',
        dataIndex: 'usageCount',
        // Just wide enough for the title and the cell's 16px side padding.
        width: '5.5rem',
        align: 'center',
        responsive: ['sm'],
    },
    {
        title: <span className="visually-hidden">Actions</span>,
        key: 'actions',
        // Three icon buttons, 36px each below 768px, the 0.25rem gaps between them, and the cell's 16px side padding.
        width: '9.5rem',
        align: 'right',
        render: (_, preset) => <PresetRowActions preset={preset} onEdit={onEdit} />,
    },
]

interface IProps {
    // Sorted by name by usePresets.
    presets: Preset[]
    isLoading: boolean
    emptyText: ReactNode
}

export function PresetsTable({ presets, isLoading, emptyText }: IProps) {
    const { styles } = useStyles()

    // Kept apart from the open flag so the modal's closing animation still shows the preset it was editing.
    const [editedPreset, setEditedPreset] = useState<Preset>()
    const [isEditOpen, setIsEditOpen] = useState(false)

    const handleEdit = (preset: Preset) => {
        setEditedPreset(preset)
        setIsEditOpen(true)
    }

    return (
        <>
            <Table<Preset>
                rowKey="id"
                columns={getColumns(styles, handleEdit)}
                tableLayout="fixed"
                dataSource={presets}
                loading={isLoading}
                pagination={false}
                locale={{ emptyText }}
            />
            <PresetModal
                isOpen={isEditOpen}
                preset={editedPreset}
                title="Edit preset"
                onClose={() => setIsEditOpen(false)}
            />
        </>
    )
}
