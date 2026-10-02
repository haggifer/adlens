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
import { type ComponentType, useState } from 'react'
import { useStyles } from './styles'

// One fade in and out per icon.
const ICON_CYCLE_MS = 800

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

// The running step's icon, in place of a spinner: the icons take turns, each fading in and out. The fade is one infinite
// animation and the icon changes when a cycle ends, while it's invisible, so fade and switch never drift apart; with
// reduced motion the animation is off and the first icon stays. Decoration only: the step titles carry the status.
export function AnalysisAnimation() {
    const { styles } = useStyles()
    const theme = useTheme()

    const [index, setIndex] = useState(0)

    const { Icon, color } = ICONS[index]

    const handleCycleEnd = () => setIndex((prev) => (prev + 1) % ICONS.length)

    return (
        <span
            className={styles.stepIcon}
            style={{ color: theme[color], animationDuration: `${ICON_CYCLE_MS}ms` }}
            onAnimationIteration={handleCycleEnd}
            aria-hidden
        >
            <Icon />
        </span>
    )
}
