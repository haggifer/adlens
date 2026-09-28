'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useState } from 'react'
import { config } from '@/config'
import { useTheme } from '@/design/ThemeContext'
import { useStyles } from './styles'

interface IProps {
    onToken: (token: string | null) => void
}

// Cloudflare Turnstile in Managed mode: most visitors pass without clicking anything. A token works once, so the
// parent remounts this component (a new `key`) after every attempt.
export function HumanCheck({ onToken }: IProps) {
    const { styles } = useStyles()
    const { isDark } = useTheme()
    const [hasFailed, setHasFailed] = useState(false)

    const handleUnavailable = () => {
        setHasFailed(true)
        onToken(null)
    }

    // Turnstile's defaults re-issue a token on its own after a routine expiry (refresh-expired: 'auto',
    // retry: 'auto'), so a later success must clear the hint left by an earlier failure.
    const handleSuccess = (token: string) => {
        setHasFailed(false)
        onToken(token)
    }

    return (
        <div>
            <Turnstile
                siteKey={config.turnstileSiteKey}
                options={{ theme: isDark ? 'dark' : 'light', size: 'flexible' }}
                onSuccess={handleSuccess}
                onExpire={handleUnavailable}
                onError={handleUnavailable}
            />
            {hasFailed && (
                <p className={styles.hint}>
                    Couldn’t load the human check. Reload the page, or allow challenges.cloudflare.com.
                </p>
            )}
        </div>
    )
}
