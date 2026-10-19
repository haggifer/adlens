'use client'

import { refreshSession } from '@/auth/session'
import { NotFoundState } from '@/components/status/NotFoundState'
import { ADMIN_QUERY_KEY, useAdminJobs } from '@/hooks/useAdminJobs'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { RequestErrorCode } from 'adlens-shared'
import { Alert, Button, Tabs } from 'antd'
import { useEffect, useState } from 'react'
import { JobsTable } from './JobsTable'
import { useStyles } from './styles'
import { UsersTable } from './UsersTable'

type AdminTab = 'jobs' | 'users'

export function AdminView() {
    const { styles } = useStyles()
    const queryClient = useQueryClient()

    const [tab, setTab] = useState<AdminTab>('jobs')

    const { jobs, isLoading: isJobsLoading, error: jobsError } = useAdminJobs()
    const { users, isLoading: isUsersLoading, error: usersError } = useAdminUsers()

    const error = jobsError ?? usersError
    // The API answers a non-admin as it does an unknown route: the admin flag was removed since the page opened, or the
    // session expired.
    const isNoLongerAdmin = [jobsError, usersError].some((err) => err?.code === RequestErrorCode.NotFound)
    const isLoading = isJobsLoading || isUsersLoading

    const handleReload = () => void queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY] })

    // Admin reads never answer 401, so nothing else notices an expired session. Fetched again, a dead one sends the
    // visitor to PrivateRoute's sign-in prompt, and a live one keeps this not-found page.
    useEffect(() => {
        if (isNoLongerAdmin) {
            refreshSession()
        }
    }, [isNoLongerAdmin])

    if (isNoLongerAdmin) {
        return <NotFoundState />
    }

    return (
        <section className={styles.page}>
            <h1 className={styles.pageTitle}>Admin</h1>
            {error && <Alert type="error" showIcon title={error.message} />}
            <Tabs
                activeKey={tab}
                onChange={(key) => setTab(key as AdminTab)}
                tabBarExtraContent={
                    <Button size="small" icon={<ReloadOutlined />} onClick={handleReload}>
                        Reload
                    </Button>
                }
                items={[
                    {
                        key: 'jobs',
                        label: 'Jobs',
                        children: (
                            <JobsTable
                                jobs={jobs}
                                users={users}
                                isUserListMissing={Boolean(usersError)}
                                isLoading={isLoading}
                            />
                        ),
                    },
                    {
                        key: 'users',
                        label: 'Users',
                        children: <UsersTable users={users} jobs={jobs} isLoading={isLoading} />,
                    },
                ]}
            />
        </section>
    )
}
