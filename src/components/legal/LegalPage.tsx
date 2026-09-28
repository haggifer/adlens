'use client'

import type { ReactNode } from 'react'
import { BackButton } from '@/components/utils/BackButton'
import { useStyles } from './styles'

interface IProps {
    title: string
    lastUpdated: string
    children: ReactNode
}

export function LegalPage({ title, lastUpdated, children }: IProps) {
    const { styles } = useStyles()

    return (
        <section className={styles.page}>
            <div className={styles.column}>
                <div className={styles.backBar}>
                    <BackButton fallbackHref="/" />
                </div>
                <article className={styles.document}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.updated}>Last updated {lastUpdated}</p>
                    {children}
                </article>
            </div>
        </section>
    )
}
