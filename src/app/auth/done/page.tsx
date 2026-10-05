import { SocialSignInDone } from '@/components/auth/SocialSignInDone'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Signing in',
    robots: { index: false, follow: false },
}

interface IProps {
    searchParams: Promise<{ error?: string }>
}

// Better Auth's Google / GitHub callback sends the sign-in popup here, with `?error=<code>` when the sign-in failed.
export default async function SocialSignInDonePage({ searchParams }: IProps) {
    const { error } = await searchParams

    return <SocialSignInDone errorCode={error ?? null} />
}
