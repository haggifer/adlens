'use client'

import { AuthView, useAuthModalStore } from '@/contexts/stores/authModalStore'
import { MODAL_WIDTH } from '@/design/theme'
import { Modal } from 'antd'
import { ConfirmEmailNotice } from './ConfirmEmailNotice'
import { ForgotForm } from './ForgotForm'
import { ResetPasswordForm } from './ResetPasswordForm'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { useStyles } from './styles'

const TITLES: Record<AuthView, string> = {
    signin: 'Sign In',
    signup: 'Create your account',
    forgot: 'Reset your password',
    confirm: 'Confirm your email',
    reset: 'Choose a new password',
}

const SUBTITLES: Record<AuthView, string> = {
    signin: '',
    signup: '',
    forgot: 'Enter your email and we’ll send you a reset link.',
    confirm: '',
    reset: '',
}

export function AuthModal() {
    const { styles } = useStyles()
    const view = useAuthModalStore((s) => s.view)
    const setView = useAuthModalStore((s) => s.setView)

    const renderBody = () => {
        if (view === 'signup') {
            return <SignUpForm />
        }

        if (view === 'forgot') {
            return <ForgotForm />
        }

        if (view === 'confirm') {
            return <ConfirmEmailNotice />
        }

        if (view === 'reset') {
            return <ResetPasswordForm />
        }

        return <SignInForm />
    }

    return (
        <Modal
            open={view !== null}
            onCancel={() => setView(null)}
            footer={null}
            width={MODAL_WIDTH}
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
