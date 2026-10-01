'use client'

import { Button, Result } from 'antd'
import { useRouter } from 'next/navigation'
import { useStyles } from './styles'

export function NotFoundState() {
    const { styles } = useStyles()
    const router = useRouter()

    return (
        <section className={styles.page}>
            <div className={styles.card}>
                <Result
                    status="info"
                    title="Page not found"
                    subTitle="This page doesn’t exist, or it has moved."
                    extra={
                        <Button type="primary" onClick={() => router.push('/')}>
                            Go to the home page
                        </Button>
                    }
                />
            </div>
        </section>
    )
}
