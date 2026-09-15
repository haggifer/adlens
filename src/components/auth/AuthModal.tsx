'use client'

import { Modal } from 'antd'
import { AuthView, useAuth } from '@/auth/AuthContext'
import ForgotForm from './ForgotForm'
import SignInForm from './SignInForm'
import SignUpForm from './SignUpForm'
import { useStyles } from './styles'

const TITLES: Record<AuthView, string> = {
    signin: 'Sign In',
    signup: 'Create your account',
    forgot: 'Reset your password',
}

const SUBTITLES: Record<AuthView, string> = {
    signin: '',
    signup: 'Start diagnosing your video ads in minutes.',
    forgot: 'Enter your email and we’ll send you a reset link.',
}

export default function AuthModal() {
    const { styles } = useStyles()
    const { view, closeAuth } = useAuth()

    const renderBody = () => {
        if (view === 'signup') {
            return <SignUpForm />
        }

        if (view === 'forgot') {
            return <ForgotForm />
        }

        return <SignInForm />
    }

    return (
        <Modal
            open={view !== null}
            onCancel={closeAuth}
            footer={null}
            width={420}
            centered
            destroyOnHidden
            title={
                view ? (
                    <div className={styles.head}>
                        <span className={styles.title}>{TITLES[view]}</span>
                        {SUBTITLES[view] && <span className={styles.subtitle}>{SUBTITLES[view]}</span>}
                    </div>
                ) : null
            }
        >
            {view ? renderBody() : null}
        </Modal>
    )
}
