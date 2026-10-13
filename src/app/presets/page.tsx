import { PresetsView } from '@/components/presets/PresetsView'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Presets',
    robots: { index: false, follow: false },
}

export default function PresetsPage() {
    return <PresetsView />
}
