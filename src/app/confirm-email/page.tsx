import { ConfirmEmail } from '@/components/account/ConfirmEmail'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Confirming your email',
    robots: { index: false, follow: false },
}

interface IProps {
    searchParams: Promise<{ token?: string }>
}

// The confirmation email links here with `?token=`; the page confirms it, then sends the user home.
export default async function ConfirmEmailPage({ searchParams }: IProps) {
    const { token } = await searchParams

    return <ConfirmEmail token={token ?? null} />
}
