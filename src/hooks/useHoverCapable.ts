'use client'

import { useEffect, useState } from 'react'

const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

export function useHoverCapable(): boolean {
    const [hoverCapable, setHoverCapable] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return true
        }

        return window.matchMedia(HOVER_QUERY).matches
    })

    useEffect(() => {
        const query = window.matchMedia(HOVER_QUERY)
        const handleChange = (event: MediaQueryListEvent) => setHoverCapable(event.matches)

        query.addEventListener('change', handleChange)

        return () => query.removeEventListener('change', handleChange)
    }, [])

    return hoverCapable
}
