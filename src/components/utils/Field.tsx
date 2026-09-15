'use client'

import { ReactNode } from 'react'
import { useStyles } from './styles'

interface IProps {
    label: string
    error?: string
    children: ReactNode
}

export default function Field({ label, error, children }: IProps) {
    const { styles } = useStyles()

    return (
        <div className={styles.field}>
            <label className={styles.fieldLabel}>{label}</label>
            {children}
            {error && <p className={styles.fieldError}>{error}</p>}
        </div>
    )
}
