'use client'

import { ErrorState } from '@/components/status/ErrorState'
import { useEffect } from 'react'

interface IProps {
    error: Error & { digest?: string }
    retry: () => void
}

export default function RouteError({ error, retry }: IProps) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return <ErrorState onRetry={retry} />
}
