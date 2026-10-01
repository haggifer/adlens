'use client'

import { RequestErrorCode } from 'adlens-shared'
import { Button, Result } from 'antd'
import { ApiRequestError } from '@/api/errors'
import { useStyles } from './styles'

// A render failure's own message is a developer's text (or a server digest), never copy for the user.
const ERROR_COPY = new ApiRequestError(RequestErrorCode.Internal).message

interface IProps {
    onRetry: () => void
}

export function ErrorState({ onRetry }: IProps) {
    const { styles } = useStyles()

    return (
        <section className={styles.page}>
            <div className={styles.card}>
                <Result
                    status="error"
                    title={ERROR_COPY}
                    extra={
                        <Button type="primary" onClick={onRetry}>
                            Try again
                        </Button>
                    }
                />
            </div>
        </section>
    )
}
