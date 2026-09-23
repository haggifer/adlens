import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/account/ResetPasswordForm'

export const metadata: Metadata = {
    title: 'Reset password',
    robots: { index: false, follow: false },
}

interface IProps {
    searchParams: Promise<{ token?: string; error?: string }>
}

// Better Auth redirects here from the emailed link with `?token=` on success or `?error=INVALID_TOKEN`.
export default async function ResetPasswordPage({ searchParams }: IProps) {
    const { token, error } = await searchParams

    return <ResetPasswordForm token={error ? null : (token ?? null)} />
}
