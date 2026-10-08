'use client'

import { BackButton } from '@/components/utils/BackButton'
import type { ReactNode } from 'react'
import { useStyles } from './styles'

interface IProps {
    title: string
    lastUpdated: string
    children: ReactNode
}

export function LegalPage({ title, lastUpdated, children }: IProps) {
    const { styles, cx } = useStyles()

    return (
        <section className={styles.page}>
            <div className={styles.backBar}>
                <div className={cx(styles.column, 'align-items-start')}>
                    <BackButton fallbackHref="/" />
                </div>
            </div>
            <div className={styles.column}>
                <article className={styles.document}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.updated}>Last updated {lastUpdated}</p>
                    {children}
                </article>
            </div>
        </section>
    )
}
