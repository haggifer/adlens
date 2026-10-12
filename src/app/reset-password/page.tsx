import { toPasswordResetPath } from '@/auth/password-reset-link'
import { redirect } from 'next/navigation'

interface IProps {
    searchParams: Promise<{ token?: string }>
}

// Reset emails sent before the form moved into the auth modal link here with `?token=`; they expire an hour after
// sending, so this page can go once a release has been live that long.
export default async function ResetPasswordPage({ searchParams }: IProps) {
    const { token } = await searchParams

    redirect(token ? toPasswordResetPath(token) : '/')
}
