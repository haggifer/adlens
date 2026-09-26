import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/account/ResetPasswordForm'

export const metadata: Metadata = {
    title: 'Reset password',
    robots: { index: false, follow: false },
}

interface IProps {
    searchParams: Promise<{ token?: string }>
}

// The password-reset email links here with `?token=`; an invalid or expired token is reported when the form is sent.
export default async function ResetPasswordPage({ searchParams }: IProps) {
    const { token } = await searchParams

    return <ResetPasswordForm token={token ?? null} />
}
