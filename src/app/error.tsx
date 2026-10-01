'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/status/ErrorState'

interface IProps {
    error: Error & { digest?: string }
    unstable_retry: () => void
}

// Inside the root layout, so the header and footer stay usable while a page has failed.
export default function RouteError({ error, unstable_retry }: IProps) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return <ErrorState onRetry={unstable_retry} />
}
