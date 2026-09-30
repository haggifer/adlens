'use client'

import {
    AudioOutlined,
    FileSearchOutlined,
    FontSizeOutlined,
    NotificationOutlined,
    PlayCircleOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useTheme } from 'antd-style'
import { type ComponentType, useEffect, useState } from 'react'
import { useStyles } from './styles'

export const ICON_INTERVAL_MS = 800

type PresetColor = 'magenta' | 'blue' | 'cyan' | 'purple' | 'green' | 'orange'

interface AnimatedIcon {
    Icon: ComponentType
    color: PresetColor
}

// What the analysis looks at: the ad, its picture, its sound, its text, the policies, the evidence.
const ICONS: AnimatedIcon[] = [
    { Icon: NotificationOutlined, color: 'magenta' },
    { Icon: PlayCircleOutlined, color: 'blue' },
    { Icon: AudioOutlined, color: 'cyan' },
    { Icon: FontSizeOutlined, color: 'purple' },
    { Icon: SafetyCertificateOutlined, color: 'green' },
    { Icon: FileSearchOutlined, color: 'orange' },
]

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The running step's icon, in place of a spinner: the icons take turns, each fading in and out. Decoration only: the
// step titles carry the status.
export function AnalysisAnimation() {
    const { styles } = useStyles()
    const theme = useTheme()
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (prefersReducedMotion()) {
            return undefined
        }

        const timer = setInterval(() => setIndex((prev) => (prev + 1) % ICONS.length), ICON_INTERVAL_MS)

        return () => clearInterval(timer)
    }, [])

    const { Icon, color } = ICONS[index]

    return (
        <span
            key={index}
            className={styles.stepIcon}
            style={{ color: theme[color], animationDuration: `${ICON_INTERVAL_MS}ms` }}
            aria-hidden
        >
            <Icon />
        </span>
    )
}
