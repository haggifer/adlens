'use client'

import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useNavigationStore } from '@/contexts/stores/navigationStore'
import { useStyles } from './styles'

interface IProps {
    title: string
    lastUpdated: string
    children: ReactNode
}

export default function LegalPage({ title, lastUpdated, children }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const hasNavigated = useNavigationStore((s) => s.hasNavigated)

    // Opened directly (a new tab, an email link), there is no in-app page to return to, so go home instead.
    const handleBack = () => (hasNavigated ? router.back() : router.push('/'))

    return (
        <section className={styles.page}>
            <div className={styles.column}>
                <Button type="text" icon={<ArrowLeftOutlined />} className={styles.backButton} onClick={handleBack}>
                    Back
                </Button>
                <article className={styles.document}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.updated}>Last updated {lastUpdated}</p>
                    {children}
                </article>
            </div>
        </section>
    )
}
