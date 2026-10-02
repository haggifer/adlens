'use client'

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { RequestErrorCode } from 'adlens-shared'
import { type Ref, useImperativeHandle, useRef, useState } from 'react'
import { ApiRequestError } from '@/api/errors'
import { config } from '@/config'
import { useTheme } from '@/design/ThemeContext'
import { useStyles } from './styles'

// Long enough for the Cloudflare script to load and a non-interactive check to finish on a slow connection. A visitor
// answering a challenge gets as long as Cloudflare allows; the limit starts again once they've answered.
const CHECK_TIMEOUT_MS = 30 * 1000

export interface HumanCheckHandle {
    // Runs the check and resolves with a fresh token; rejects with CHALLENGE_FAILED when it can't pass.
    getToken: () => Promise<string>
}

interface PendingCheck {
    resolve: (token: string) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
}

interface IProps {
    ref: Ref<HumanCheckHandle>
    // What passing the check lets the visitor do, finishing "Confirm you're human to …".
    action: string
}

// Cloudflare Turnstile in Managed mode, run only when the guarded action starts (`execution: 'execute'`) and invisible
// unless Cloudflare wants the visitor to click something (`appearance: 'interaction-only'`), which most never see.
export function HumanCheck({ ref, action }: IProps) {
    const { styles } = useStyles()
    const { isDark } = useTheme()
    const widget = useRef<TurnstileInstance>(null)
    // The caller awaits the token across Turnstile's callbacks, which only report what happened.
    const pending = useRef<PendingCheck | null>(null)
    const [isInteractive, setIsInteractive] = useState(false)
    const [hasFailed, setHasFailed] = useState(false)

    const settle = (outcome: { token: string } | { error: Error }) => {
        const check = pending.current

        if (!check) {
            return
        }

        clearTimeout(check.timer)
        pending.current = null
        setIsInteractive(false)

        if ('token' in outcome) {
            check.resolve(outcome.token)
            return
        }

        setHasFailed(true)
        check.reject(outcome.error)
    }

    const fail = () => settle({ error: new ApiRequestError(RequestErrorCode.ChallengeFailed) })

    useImperativeHandle(ref, () => ({
        getToken: () =>
            new Promise<string>((resolve, reject) => {
                pending.current?.reject(new ApiRequestError(RequestErrorCode.ChallengeFailed))
                pending.current = { resolve, reject, timer: setTimeout(fail, CHECK_TIMEOUT_MS) }
                setHasFailed(false)
                // A token works once, so every run starts from a fresh widget.
                widget.current?.reset()
                widget.current?.execute()
            }),
    }))

    // The visitor is answering a challenge: no limit of ours while they do. Cloudflare ends an unanswered one through
    // `onTimeout` or `onExpire`.
    const handleBeforeInteractive = () => {
        if (pending.current) {
            clearTimeout(pending.current.timer)
        }

        setIsInteractive(true)
    }

    const handleAfterInteractive = () => {
        if (pending.current) {
            clearTimeout(pending.current.timer)
            pending.current.timer = setTimeout(fail, CHECK_TIMEOUT_MS)
        }

        setIsInteractive(false)
    }

    return (
        <div>
            <Turnstile
                ref={widget}
                siteKey={config.turnstileSiteKey}
                options={{
                    theme: isDark ? 'dark' : 'light',
                    size: 'flexible',
                    execution: 'execute',
                    appearance: 'interaction-only',
                }}
                // Run clicked before Cloudflare's script finished loading: start the check now that it can run.
                onWidgetLoad={() => pending.current && widget.current?.execute()}
                onSuccess={(token) => settle({ token })}
                onError={fail}
                onExpire={fail}
                onTimeout={fail}
                onBeforeInteractive={handleBeforeInteractive}
                onAfterInteractive={handleAfterInteractive}
            />
            {isInteractive && <p className={styles.hint}>Confirm you’re human to {action}.</p>}
            {hasFailed && (
                <p className={styles.hint}>
                    Couldn’t load the human check. Reload the page, or allow challenges.cloudflare.com.
                </p>
            )}
        </div>
    )
}
