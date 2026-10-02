'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/status/ErrorState'

interface IProps {
    error: Error & { digest?: string }
    retry: () => void
}

// Inside the root layout, so the header and footer stay usable while a page has failed.
export default function RouteError({ error, retry }: IProps) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return <ErrorState onRetry={retry} />
}
