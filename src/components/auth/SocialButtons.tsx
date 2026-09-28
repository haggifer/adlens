'use client'

import { GithubOutlined } from '@ant-design/icons'
import { App, Button, Divider } from 'antd'
import { type ReactNode, useState } from 'react'
import { signIn } from '@/auth/authClient'
import { describeError, runAuthRequest } from '@/auth/errors'
import type { SocialProvider } from '@/auth/types'
import { SOCIAL_PROVIDER_LABELS } from '@/labels'

// Google's sign-in branding requires its four-colour "G"; the brand colours are fixed, not theme tokens.
const GOOGLE_LOGO = (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
    </svg>
)

const PROVIDER_ICONS: Record<SocialProvider, ReactNode> = {
    google: GOOGLE_LOGO,
    github: <GithubOutlined />,
}

const PROVIDERS: SocialProvider[] = ['google', 'github']

export function SocialButtons() {
    const { notification } = App.useApp()
    const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null)

    // Both callbacks return to the current page: the API appends ?error=<code> when the sign-in fails.
    const handleSignIn = async (provider: SocialProvider) => {
        setPendingProvider(provider)

        const error = await runAuthRequest(() =>
            signIn.social({ provider, callbackURL: window.location.href, errorCallbackURL: window.location.href }),
        )

        if (error) {
            setPendingProvider(null)
            notification.error({ title: describeError(error), placement: 'bottomRight' })
        }
    }

    return (
        <>
            <div className="d-flex flex-column gap-2">
                {PROVIDERS.map((provider) => (
                    <Button
                        key={provider}
                        size="large"
                        block
                        icon={PROVIDER_ICONS[provider]}
                        loading={pendingProvider === provider}
                        disabled={pendingProvider !== null && pendingProvider !== provider}
                        onClick={() => handleSignIn(provider)}
                    >
                        Continue with {SOCIAL_PROVIDER_LABELS[provider]}
                    </Button>
                ))}
            </div>
            <Divider plain>or</Divider>
        </>
    )
}
