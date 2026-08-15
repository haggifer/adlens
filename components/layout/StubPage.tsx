'use client'

import useStyles from './styles'

interface IProps {
    title: string
    subtitle: string
}

export default function StubPage({ title, subtitle }: IProps) {
    const { styles } = useStyles()

    return (
        <section className={styles.stubPage}>
            <h1 className={styles.stubTitle}>{title}</h1>
            <p className={styles.stubSubtitle}>{subtitle}</p>
        </section>
    )
}
