import type { Metadata } from 'next'
import EmailVerified from '@/components/account/EmailVerified'

export const metadata: Metadata = {
    title: 'Email confirmed',
    robots: { index: false, follow: false },
}

interface IProps {
    searchParams: Promise<{ error?: string }>
}

// Better Auth redirects here after the emailed confirmation link, with `?error=` when the token was invalid or expired.
export default async function EmailVerifiedPage({ searchParams }: IProps) {
    const { error } = await searchParams

    return <EmailVerified isFailed={Boolean(error)} />
}
