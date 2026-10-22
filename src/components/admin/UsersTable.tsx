'use client'

import { AccountKind } from '@/auth/types'
import type { AdminJob, AdminUser } from 'adlens-shared'
import { Table, type TableColumnsType, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { ANONYMOUS_EMAIL, getCreatedColumn, TABLE_PAGINATION } from './admin-table'
import { type AdminUserRow, toUserRows } from './admin-usage'
import { formatCost } from './model-pricing'

export const USER_TYPE_TAGS: Record<AccountKind, { label: string; color?: string }> = {
    [AccountKind.Anonymous]: { label: 'Anonymous' },
    [AccountKind.Unconfirmed]: { label: 'Unconfirmed', color: 'warning' },
    [AccountKind.Member]: { label: 'Member', color: 'success' },
    [AccountKind.Admin]: { label: 'Admin', color: 'purple' },
}

const USER_TYPE_ORDER = Object.values(AccountKind)

const LOCALE = { emptyText: 'No users' }

const SCROLL = { x: 'max-content' }

const COLUMNS: TableColumnsType<AdminUserRow> = [
    getCreatedColumn((row) => row.user.createdAt),
    {
        title: 'Email',
        key: 'email',
        width: 260,
        ellipsis: true,
        sorter: (a, b) => (a.user.email ?? '').localeCompare(b.user.email ?? ''),
        render: (_, row) => row.user.email ?? <Typography.Text type="secondary">{ANONYMOUS_EMAIL}</Typography.Text>,
    },
    {
        title: 'Type',
        key: 'type',
        width: 130,
        sorter: (a, b) => USER_TYPE_ORDER.indexOf(a.type) - USER_TYPE_ORDER.indexOf(b.type),
        render: (_, row) => <Tag color={USER_TYPE_TAGS[row.type].color}>{USER_TYPE_TAGS[row.type].label}</Tag>,
    },
    {
        title: 'Jobs',
        key: 'jobs',
        width: 90,
        sorter: (a, b) => a.jobs - b.jobs,
        render: (_, row) => row.jobs,
    },
    {
        title: 'Cost',
        key: 'cost',
        width: 100,
        sorter: (a, b) => (a.usd ?? -1) - (b.usd ?? -1),
        render: (_, row) => formatCost(row.usd),
    },
]

interface IProps {
    users: AdminUser[]
    jobs: AdminJob[]
    isLoading?: boolean
}

export function UsersTable({ users, jobs, isLoading }: IProps) {
    const rows = useMemo(() => toUserRows(users, jobs), [users, jobs])

    return (
        <Table<AdminUserRow>
            size="small"
            rowKey={(row) => row.user.id}
            loading={isLoading}
            columns={COLUMNS}
            dataSource={rows}
            pagination={TABLE_PAGINATION}
            tableLayout="fixed"
            scroll={SCROLL}
            locale={LOCALE}
        />
    )
}
