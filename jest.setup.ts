import '@testing-library/jest-dom'

// antd's responsive helpers query matchMedia, which jsdom doesn't implement.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
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
