'use client'

import { getFirebaseAnalytics } from '@/lib/firebase/config'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import { ReactNode, useEffect, useState } from 'react'

interface IProps {
    children: ReactNode
}

export default function Providers({ children }: IProps) {
    const [queryClient] = useState(() => new QueryClient())

    useEffect(() => {
        void getFirebaseAnalytics()
    }, [])

    return (
        <AntdRegistry>
            <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
                <AntdApp>
                    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
                </AntdApp>
            </ConfigProvider>
        </AntdRegistry>
    )
}
