'use client'

import { ReactNode } from 'react'
import { useStyles } from './styles'

interface IProps {
    label: string
    // The id of the input the label names, so the label is announced with it and clicking it focuses the input.
    htmlFor?: string
    error?: string
    children: ReactNode
}

export default function Field({ label, htmlFor, error, children }: IProps) {
    const { styles } = useStyles()

    return (
        <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={htmlFor}>
                {label}
            </label>
            {children}
            {error && <p className={styles.fieldError}>{error}</p>}
        </div>
    )
}
