'use client'

import { CheckCircleFilled, FileSearchOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useRouter } from 'next/navigation'
import { useStyles } from './styles'

const FEATURES = [
    'Will it be approved? Policy risks for every platform and market you target',
    'What’s holding it back? Gaps against the platforms’ own creative best practices',
    'Placement specs, plus a checklist of what to confirm in your campaign setup',
    'Every finding timestamped and linked to the policy or guide it comes from',
]

export function UploadIntro() {
    const { styles } = useStyles()
    const router = useRouter()

    return (
        <div className={styles.panel}>
            <h2 className={styles.panelTitle}>What you’ll get</h2>
            <ul className={styles.featureList}>
                {FEATURES.map((feature) => (
                    <li key={feature} className={styles.featureItem}>
                        <CheckCircleFilled />
                        {feature}
                    </li>
                ))}
            </ul>
            <Button className="align-self-start" icon={<FileSearchOutlined />} onClick={() => router.push('/demo')}>
                See example reports
            </Button>
        </div>
    )
}
