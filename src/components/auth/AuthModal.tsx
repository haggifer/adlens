'use client'

import { useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { App, Button, Form, Input, Modal } from 'antd'
import { AuthView, useAuth } from '@/auth/AuthContext'
import { auth } from '@/firebase/config'
import useStyles from './styles'

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

const AUTH_ERRORS: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
    'auth/too-many-requests': 'Too many attempts — please try again later.',
    'auth/user-not-found': 'No account found for that email.',
}

const describeAuthError = (err: unknown): string =>
    err instanceof FirebaseError ? (AUTH_ERRORS[err.code] ?? 'Something went wrong. Please try again.') : 'Something went wrong. Please try again.'

interface SignInValues {
    email: string
    password: string
}

interface SignUpValues {
    email: string
    password: string
    confirm: string
}

interface ForgotValues {
    email: string
}

export default function AuthModal() {
    const { styles } = useStyles()
    const { view, openAuth, closeAuth } = useAuth()
    const { message } = App.useApp()
    const [submitting, setSubmitting] = useState(false)

    const handleSignIn = async ({ email, password }: SignInValues) => {
        try {
            setSubmitting(true)
            await signInWithEmailAndPassword(auth, email, password)
            message.success('Signed in')
            closeAuth()
        } catch (err) {
            message.error(describeAuthError(err))
        } finally {
            setSubmitting(false)
        }
    }

    const handleSignUp = async ({ email, password }: SignUpValues) => {
        try {
            setSubmitting(true)
            await createUserWithEmailAndPassword(auth, email, password)
            message.success('Account created')
            closeAuth()
        } catch (err) {
            message.error(describeAuthError(err))
        } finally {
            setSubmitting(false)
        }
    }

    const handleForgot = async ({ email }: ForgotValues) => {
        try {
            setSubmitting(true)
            await sendPasswordResetEmail(auth, email)
            message.success('Password reset link sent')
            openAuth('signin')
        } catch (err) {
            message.error(describeAuthError(err))
        } finally {
            setSubmitting(false)
        }
    }

    const renderBody = () => {
        if (view === 'signup') {
            return (
                <Form<SignUpValues> layout="vertical" requiredMark={false} onFinish={handleSignUp}>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
                    >
                        <Input size="large" placeholder="you@company.com" autoComplete="email" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
                    >
                        <Input.Password size="large" placeholder="Create a password" autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item
                        name="confirm"
                        label="Confirm password"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Confirm your password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve()
                                    }

                                    return Promise.reject(new Error('Passwords do not match'))
                                },
                            }),
                        ]}
                    >
                        <Input.Password size="large" placeholder="Repeat your password" autoComplete="new-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
                        Create account
                    </Button>
                    <div className={styles.switcher}>
                        <span>Already have an account?</span>
                        <Button type="link" onClick={() => openAuth('signin')}>
                            Sign in
                        </Button>
                    </div>
                </Form>
            )
        }

        if (view === 'forgot') {
            return (
                <Form<ForgotValues> layout="vertical" requiredMark={false} onFinish={handleForgot}>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
                    >
                        <Input size="large" placeholder="you@company.com" autoComplete="email" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
                        Send reset link
                    </Button>
                    <div className={styles.switcher}>
                        <Button type="link" onClick={() => openAuth('signin')}>
                            Back to sign in
                        </Button>
                    </div>
                </Form>
            )
        }

        return (
            <Form<SignInValues> layout="vertical" requiredMark={false} onFinish={handleSignIn}>
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
                >
                    <Input size="large" placeholder="you@company.com" autoComplete="email" />
                </Form.Item>
                <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
                    <Input.Password size="large" placeholder="Your password" autoComplete="current-password" />
                </Form.Item>
                <div className={styles.forgot}>
                    <Button type="link" size="small" onClick={() => openAuth('forgot')}>
                        Forgot password?
                    </Button>
                </div>
                <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
                    Sign in
                </Button>
                <div className={styles.switcher}>
                    <span>Don’t have an account?</span>
                    <Button className={styles.switchAction} onClick={() => openAuth('signup')}>
                        Sign up
                    </Button>
                </div>
            </Form>
        )
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
