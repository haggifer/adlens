import '@testing-library/jest-dom'

// antd's responsive helpers query matchMedia, which jsdom doesn't implement. Tests run as a desktop with a mouse: it can
// hover (useHoverCapable), and no width breakpoint matches.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: query.includes('hover: hover'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
})

// antd's text areas measure themselves with ResizeObserver, which jsdom doesn't implement either.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub })

// rc-select defers its open state to a MessageChannel macrotask, which jsdom doesn't provide; a timer is one too.
class MessageChannelStub {
    port1: { onmessage: ((event: MessageEvent) => void) | null } = { onmessage: null }
    port2 = {
        postMessage: (data: unknown) => {
            setTimeout(() => this.port1.onmessage?.(new MessageEvent('message', { data })))
        },
    }
}

Object.defineProperty(window, 'MessageChannel', { writable: true, value: MessageChannelStub })

// The social sign-in popup reports back over a BroadcastChannel, which jsdom doesn't implement. This one delivers to
// every other open channel of the same name, a task later, as browsers do.
class BroadcastChannelStub {
    static openChannels = new Set<BroadcastChannelStub>()

    onmessage: ((event: MessageEvent) => void) | null = null

    constructor(readonly name: string) {
        BroadcastChannelStub.openChannels.add(this)
    }

    postMessage(data: unknown) {
        BroadcastChannelStub.openChannels.forEach((channel) => {
            if (channel === this || channel.name !== this.name) {
                return
            }

            setTimeout(() => {
                if (BroadcastChannelStub.openChannels.has(channel)) {
                    channel.onmessage?.(new MessageEvent('message', { data }))
                }
            })
        })
    }

    close() {
        BroadcastChannelStub.openChannels.delete(this)
    }
}

Object.defineProperty(window, 'BroadcastChannel', { writable: true, value: BroadcastChannelStub })
