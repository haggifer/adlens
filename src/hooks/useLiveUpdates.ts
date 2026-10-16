import { ApiRequestError } from '@/api/errors'
import { getLiveToken } from '@/api/live'
import { useAuth } from '@/auth/AuthContext'
import { useLiveStore } from '@/contexts/stores/liveStore'
import { admissionKey } from '@/hooks/useAdmission'
import { jobKey } from '@/hooks/useJob'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { quotaKey } from '@/hooks/useQuota'
import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query'
import type { AuthOptions, ChannelStateChange, ConnectionStateChange, ErrorInfo, InboundMessage } from 'ably'
import { getLiveChannel, LiveEvent, liveJobEventSchema, RequestErrorCode } from 'adlens-shared'
import { useEffect } from 'react'

type AuthCallback = NonNullable<AuthOptions['authCallback']>

// Ably treats a 403 from the auth callback as final and stops connecting, where any other error is retried with its own
// back-off: an API without live updates (no key, or one that predates the token route) is told apart from one that
// can't be reached right now. Ably accepts a plain object with an ErrorInfo's fields.
const LIVE_OFF = { code: 40300, statusCode: 403, message: 'Live updates are off' } as ErrorInfo

const isLiveOff = (err: unknown) => err instanceof ApiRequestError && err.code === RequestErrorCode.NotFound

// A read already on its way may have started before the change, so it is started again.
const refetch = (queryClient: QueryClient, queryKey: QueryKey) => void queryClient.invalidateQueries({ queryKey })

const refetchAll = (queryClient: QueryClient, userId: string) => {
    refetch(queryClient, [PRESETS_KEY, userId])
    refetch(queryClient, ['job', userId])
    refetch(queryClient, ['jobs', userId])
}

// A run is charged when it is queued and refunded when it fails, so the header's count and whether Run is allowed
// follow its job.
const handleMessage = (queryClient: QueryClient, userId: string, message: InboundMessage) => {
    switch (message.name) {
        case LiveEvent.Presets:
            refetch(queryClient, [PRESETS_KEY, userId])

            return
        case LiveEvent.Job: {
            const event = liveJobEventSchema.safeParse(message.data)

            if (event.success) {
                refetch(queryClient, jobKey(userId, event.data.id))
            }

            refetch(queryClient, ['jobs', userId])
            refetch(queryClient, quotaKey(userId))
            refetch(queryClient, admissionKey(userId))
        }
    }
}

// Ably asks for the first token and again before each one expires.
const fetchToken: AuthCallback = (_params, callback) => {
    getLiveToken().then(
        (tokenRequest) => (tokenRequest ? callback(null, tokenRequest) : callback(LIVE_OFF, null)),
        (err: unknown) => callback(isLiveOff(err) ? LIVE_OFF : String(err), null),
    )
}

// Lost while Ably tries again, not while it is only connecting: an outage cycles through both. `failed` means live
// updates are off (or Ably refused this tab for good), and the tab's reads keep it current as before.
const handleConnectionChange = (
    change: ConnectionStateChange,
    onConnectionLost: (isLost: boolean) => void,
    close: () => void,
) => {
    switch (change.current) {
        case 'connected':
            onConnectionLost(false)

            return
        case 'disconnected':
        case 'suspended':
            onConnectionLost(true)

            return
        case 'failed':
            onConnectionLost(false)
            close()
    }
}

// Answers how to close the channel, or null when the tab left before Ably's client loaded (it loads only here, so a
// page never waits for it) or it couldn't load.
const openLiveChannel = async (
    userId: string,
    queryClient: QueryClient,
    onConnectionLost: (isLost: boolean) => void,
    isCancelled: () => boolean,
): Promise<(() => void) | null> => {
    try {
        const { BaseRealtime, FetchRequest, WebSocketTransport } = await import('ably/modular')

        if (isCancelled()) {
            return null
        }

        const client = new BaseRealtime({ authCallback: fetchToken, plugins: { FetchRequest, WebSocketTransport } })
        const channel = client.channels.get(getLiveChannel(userId))
        const close = () => client.close()
        let hasAttached = false

        // After a long enough drop Ably can't replay what was sent meanwhile, and says so: everything is read again.
        // The first attach isn't one: a change in the moment between a page's first read and it shows on the next one
        // (a running job is also read every 10 seconds).
        const handleContinuity = (change: ChannelStateChange) => {
            if (hasAttached && !change.resumed) {
                refetchAll(queryClient, userId)
            }

            hasAttached = true
        }

        client.connection.on((change) => handleConnectionChange(change, onConnectionLost, close))
        channel.on('attached', handleContinuity)
        channel.on('update', handleContinuity)
        channel.subscribe((message) => handleMessage(queryClient, userId, message)).catch(() => undefined)

        return close
    } catch {
        return null
    }
}

// Keeps the signed-in user's presets and jobs current in every open tab: the API announces each change on the user's
// Ably channel, and the matching queries are read again.
export function useLiveUpdates(): void {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const setIsConnectionLost = useLiveStore((s) => s.setIsConnectionLost)

    const userId = user?.id

    useEffect(() => {
        if (!userId) {
            return
        }

        let close: (() => void) | null = null
        let isCancelled = false

        void openLiveChannel(userId, queryClient, setIsConnectionLost, () => isCancelled).then((closeChannel) => {
            if (isCancelled) {
                closeChannel?.()
            } else {
                close = closeChannel
            }
        })

        return () => {
            isCancelled = true
            close?.()
            setIsConnectionLost(false)
        }
    }, [userId, queryClient, setIsConnectionLost])
}
