'use client'

import { ReactNode } from 'react'
import { useStyles } from './styles'

interface IProps {
    label: string
    // The id of the input the label names, so the label is announced with it and clicking it focuses the input.
    htmlFor?: string
    // A requirement shown under the input until an error replaces it.
    hint?: string
    error?: string
    children: ReactNode
}

export function Field({ label, htmlFor, hint, error, children }: IProps) {
    const { styles } = useStyles()

    return (
        <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={htmlFor}>
                {label}
            </label>
            {children}
            {error ? <p className={styles.fieldError}>{error}</p> : hint && <p className={styles.fieldHint}>{hint}</p>}
        </div>
    )
}
