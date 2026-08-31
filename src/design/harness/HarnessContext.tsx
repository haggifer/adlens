'use client'

import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { AmbientId, DEFAULT_AMBIENT_ID } from '@/design/backgrounds'
import { HarnessSettings, writeHarness } from '@/design/harness/harness-cookie'
import { DEFAULT_RUN_ACCENT, RunAccentId } from '@/design/run-accents'
import { PRIMARY_COLOR } from '@/design/theme'

// TEMPORARY — design harness only. Holds the exploration knobs (ambient backdrop + primary override +
// Run-button accent). useHarness() falls back to defaults when no provider is mounted, so stripping the
// harness is just: remove <HarnessProvider> and <DevBar/> — the app keeps rendering the defaults.
interface HarnessContextValue {
    primaryColor: string
    setPrimaryColor: (color: string) => void
    ambientId: AmbientId
    setAmbientId: (id: AmbientId) => void
    runAccent: RunAccentId
    setRunAccent: (id: RunAccentId) => void
}

const HarnessContext = createContext<HarnessContextValue | null>(null)

interface IProps {
    children: ReactNode
    initialSettings: HarnessSettings
}

export default function HarnessProvider({ children, initialSettings }: IProps) {
    const [settings, setSettings] = useState<HarnessSettings>(initialSettings)

    const value = useMemo<HarnessContextValue>(() => {
        const update = (patch: Partial<HarnessSettings>) => {
            setSettings((prev) => {
                const next = { ...prev, ...patch }
                writeHarness(next)
                return next
            })
        }

        return {
            primaryColor: settings.primaryColor,
            setPrimaryColor: (color) => update({ primaryColor: color }),
            ambientId: settings.ambientId,
            setAmbientId: (id) => update({ ambientId: id }),
            runAccent: settings.runAccent,
            setRunAccent: (id) => update({ runAccent: id }),
        }
    }, [settings])

    return <HarnessContext.Provider value={value}>{children}</HarnessContext.Provider>
}

const FALLBACK: HarnessContextValue = {
    primaryColor: PRIMARY_COLOR,
    setPrimaryColor: () => {},
    ambientId: DEFAULT_AMBIENT_ID,
    setAmbientId: () => {},
    runAccent: DEFAULT_RUN_ACCENT,
    setRunAccent: () => {},
}

export const useHarness = (): HarnessContextValue => useContext(HarnessContext) ?? FALLBACK
