import { useEffect, useState } from 'react'

// The current time, read again every intervalMs, for what changes with time alone (a restart that stops being offered).
export function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs)

        return () => clearInterval(timer)
    }, [intervalMs])

    return now
}
