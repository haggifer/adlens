'use client'

import { Button, Result } from 'antd'
import { useRouter } from 'next/navigation'
import { useAuthModalStore } from '@/contexts/stores/authModalStore'
import { useStyles } from './styles'

interface IProps {
    isFailed: boolean
}

export default function EmailVerified({ isFailed }: IProps) {
    const { styles } = useStyles()
    const router = useRouter()
    const setView = useAuthModalStore((s) => s.setView)

    return (
        <section className={styles.page}>
            <div className={styles.card}>
                {isFailed ? (
                    <Result
                        status="warning"
                        title="This link is invalid or has expired"
                        subTitle="Sign in with your email and password and we’ll send you a new confirmation link."
                        extra={
                            <Button type="primary" onClick={() => setView('signin')}>
                                Sign in
                            </Button>
                        }
                    />
                ) : (
                    <Result
                        status="success"
                        title="Your email is confirmed"
                        subTitle="You’re signed in and ready to check your first ad."
                        extra={
                            <Button type="primary" onClick={() => router.push('/')}>
                                Check an ad
                            </Button>
                        }
                    />
                )}
            </div>
        </section>
    )
}
