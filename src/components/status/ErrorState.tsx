'use client'

import { ApiRequestError } from '@/api/errors'
import { RequestErrorCode } from 'adlens-shared'
import { Button, Result, type ResultProps } from 'antd'
import { useStyles } from './styles'

// A render failure's own message is a developer's text (or a server digest), never copy for the user.
const ERROR_COPY = new ApiRequestError(RequestErrorCode.Internal).message

// Error copy says what happened, then what to do: one sentence per line.
const RESULT_STYLES: ResultProps['styles'] = { title: { fontSize: '1.125rem', whiteSpace: 'pre-line' } }

const toSentenceLines = (text: string) => text.replace(/\.\s+/g, '.\n')

interface IProps {
    onRetry: () => void
    // The user-facing copy of a known failure; a render failure keeps the generic one.
    title?: string
    isRetrying?: boolean
}

export function ErrorState({ onRetry, title = ERROR_COPY, isRetrying = false }: IProps) {
    const { styles } = useStyles()

    return (
        <section className={styles.page}>
            <div className={styles.card}>
                <Result
                    status="error"
                    title={toSentenceLines(title)}
                    styles={RESULT_STYLES}
                    extra={
                        <Button type="primary" onClick={onRetry} loading={isRetrying}>
                            Try again
                        </Button>
                    }
                />
            </div>
        </section>
    )
}
