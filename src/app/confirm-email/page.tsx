import type { Metadata } from 'next'
import ConfirmEmail from '@/components/account/ConfirmEmail'

export const metadata: Metadata = {
    title: 'Confirm your email',
    robots: { index: false, follow: false },
}

interface IProps {
    searchParams: Promise<{ token?: string }>
}

// The confirmation email links here with `?token=`; the page confirms on a button press.
export default async function ConfirmEmailPage({ searchParams }: IProps) {
    const { token } = await searchParams

    return <ConfirmEmail token={token ?? null} />
}
