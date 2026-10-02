'use client'

import { useEffect, useState } from 'react'

const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

const isHoverSupported = () => typeof window === 'undefined' || window.matchMedia(HOVER_QUERY).matches

export function useHoverCapable(): boolean {
    const [isHoverCapable, setIsHoverCapable] = useState(isHoverSupported)

    useEffect(() => {
        const query = window.matchMedia(HOVER_QUERY)
        const handleChange = (event: MediaQueryListEvent) => setIsHoverCapable(event.matches)

        query.addEventListener('change', handleChange)

        return () => query.removeEventListener('change', handleChange)
    }, [])

    return isHoverCapable
}
