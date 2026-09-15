'use client'

import { CheckCircleFilled } from '@ant-design/icons'
import { useStyles } from './styles'

const FEATURES = [
    'An instant transcript of your ad',
    'A structural breakdown — hook, pacing, message, CTA',
    'Grounded explanations of the issues hurting performance',
]

export default function UploadIntro() {
    const { styles } = useStyles()

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
        </div>
    )
}
