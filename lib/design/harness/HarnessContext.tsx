'use client'

import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { writeHarnessPrimary } from '@/lib/design/harness/harness-cookie'
import { PRIMARY_COLOR } from '@/lib/design/theme'

// TEMPORARY — design harness only. Lets the DevBar override the locked brand primary while exploring.
// useHarness() falls back to the constant PRIMARY_COLOR when no provider is mounted, so stripping the
// harness is just: remove <HarnessProvider> and <DevBar/> — the app keeps rendering with the real brand.
interface HarnessContextValue {
    primaryColor: string
    setPrimaryColor: (color: string) => void
}

const HarnessContext = createContext<HarnessContextValue | null>(null)

interface IProps {
    children: ReactNode
    initialPrimaryColor: string
}

export default function HarnessProvider({ children, initialPrimaryColor }: IProps) {
    const [primaryColor, setPrimaryColorState] = useState(initialPrimaryColor)

    const value = useMemo<HarnessContextValue>(
        () => ({
            primaryColor,
            setPrimaryColor: (color) => {
                writeHarnessPrimary(color)
                setPrimaryColorState(color)
            },
        }),
        [primaryColor],
    )

    return <HarnessContext.Provider value={value}>{children}</HarnessContext.Provider>
}

const FALLBACK: HarnessContextValue = {
    primaryColor: PRIMARY_COLOR,
    setPrimaryColor: () => {},
}

export const useHarness = (): HarnessContextValue => useContext(HarnessContext) ?? FALLBACK
