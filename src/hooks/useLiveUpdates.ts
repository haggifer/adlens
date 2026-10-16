import { getLiveToken } from '@/api/live'
import { useAuth } from '@/auth/AuthContext'
import { useLiveStore } from '@/contexts/stores/liveStore'
import { jobKey } from '@/hooks/useJob'
import { PRESETS_KEY } from '@/hooks/usePresets'
import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query'
import type { AuthOptions, ChannelStateChange, InboundMessage } from 'ably'
import { getLiveChannel, LiveEvent, liveJobEventSchema, type LiveTokenRequest } from 'adlens-shared'
import { useEffect } from 'react'

type AuthCallback = NonNullable<AuthOptions['authCallback']>

const LOST_STATES = new Set(['disconnected', 'suspended', 'failed'])

// A read already on its way answers with the change too, so it isn't started again.
const refetch = (queryClient: QueryClient, queryKey: QueryKey) =>
    void queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false })

const refetchAll = (queryClient: QueryClient, userId: string) => {
    refetch(queryClient, [PRESETS_KEY, userId])
    refetch(queryClient, ['job', userId])
    refetch(queryClient, ['jobs', userId])
}

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
        }
    }
}

// Ably asks again before each token expires. Its first ask gets the token request already fetched to decide whether to
// connect at all.
const createAuthCallback = (first: LiveTokenRequest): AuthCallback => {
    let pending: LiveTokenRequest | null = first

    return (_params, callback) => {
        const tokenRequest = pending

        pending = null

        if (tokenRequest) {
            callback(null, tokenRequest)

            return
        }

        getLiveToken().then(
            (next) => callback(next ? null : 'Live updates are off', next),
            (err: unknown) => callback(err instanceof Error ? err.message : String(err), null),
        )
    }
}

// Answers how to close the channel, or null when live updates are off or can't start (an API without them, a network
// failure): the tab then relies on its reads. Ably's client loads only here, so a page never waits for it.
const openLiveChannel = async (
    userId: string,
    queryClient: QueryClient,
    onConnectionLost: (isLost: boolean) => void,
): Promise<(() => void) | null> => {
    try {
        const tokenRequest = await getLiveToken()

        if (!tokenRequest) {
            return null
        }

        const { BaseRealtime, FetchRequest, WebSocketTransport } = await import('ably/modular')
        const client = new BaseRealtime({
            authCallback: createAuthCallback(tokenRequest),
            plugins: { FetchRequest, WebSocketTransport },
        })
        const channel = client.channels.get(getLiveChannel(userId))
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

        client.connection.on((change) => onConnectionLost(LOST_STATES.has(change.current)))
        channel.on('attached', handleContinuity)
        channel.on('update', handleContinuity)
        channel.subscribe((message) => handleMessage(queryClient, userId, message)).catch(() => undefined)

        return () => client.close()
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

        void openLiveChannel(userId, queryClient, setIsConnectionLost).then((closeChannel) => {
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
