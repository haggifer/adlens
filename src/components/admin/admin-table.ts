import type { TableColumnType, TablePaginationConfig } from 'antd'

// Shown in place of the email of a user who has none: an anonymous session.
export const ANONYMOUS_EMAIL = 'anonymous'

export const TABLE_PAGINATION: TablePaginationConfig = {
    pageSize: 20,
    hideOnSinglePage: true,
    showSizeChanger: false,
}

export const getCreatedColumn = <T>(getCreatedAt: (row: T) => string): TableColumnType<T> => ({
    title: 'Created',
    key: 'created',
    width: 190,
    defaultSortOrder: 'descend',
    sorter: (a, b) => getCreatedAt(a).localeCompare(getCreatedAt(b)),
    render: (_, row) => new Date(getCreatedAt(row)).toLocaleString(),
})
