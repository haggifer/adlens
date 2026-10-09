import { ApiRequestError, describeRequestError } from '@/api/errors'
import { act, render, screen } from '@testing-library/react'
import { RequestErrorCode } from 'adlens-shared'
import { createRef } from 'react'
import { HumanCheck, type HumanCheckHandle } from './HumanCheck'

const mockToken = 'challenge-token'
const mockExecute = jest.fn()
const mockReset = jest.fn()
let mockOptions: Record<string, unknown> = {}

interface MockTurnstileProps {
    ref: unknown
    options: Record<string, unknown>
    onWidgetLoad: () => void
    onSuccess: (token: string) => void
    onError: () => void
    onExpire: () => void
    onTimeout: () => void
    onBeforeInteractive: () => void
    onAfterInteractive: () => void
}

// The real widget needs a live Cloudflare script, which jsdom can't load; buttons stand in for its callbacks.
jest.mock('@marsidev/react-turnstile', () => {
    const { useImperativeHandle } = jest.requireActual<typeof import('react')>('react')

    return {
        Turnstile: ({
            ref,
            options,
            onWidgetLoad,
            onSuccess,
            onError,
            onExpire,
            onTimeout,
            onBeforeInteractive,
            onAfterInteractive,
        }: MockTurnstileProps) => {
            mockOptions = options
            useImperativeHandle(ref as never, () => ({ execute: mockExecute, reset: mockReset }))

            return (
                <>
                    <button type="button" onClick={onWidgetLoad}>
                        Load the widget
                    </button>
                    <button type="button" onClick={() => onSuccess(mockToken)}>
                        Pass the check
                    </button>
                    <button type="button" onClick={onError}>
                        Fail the check
                    </button>
                    <button type="button" onClick={onExpire}>
                        Expire the challenge
                    </button>
                    <button type="button" onClick={onTimeout}>
                        Time out the challenge
                    </button>
                    <button type="button" onClick={onBeforeInteractive}>
                        Ask for a click
                    </button>
                    <button type="button" onClick={onAfterInteractive}>
                        Finish the click
                    </button>
                </>
            )
        },
    }
})
jest.mock('@/design/ThemeContext', () => ({ useTheme: () => ({ isDark: false, setScheme: jest.fn() }) }))

const INTERACTION_HINT = 'Confirm you’re human to start the analysis.'
const FAILURE_HINT = 'Couldn’t load the security check. Reload the page, or turn off your ad blocker for this site.'

const renderCheck = (action = 'start the analysis') => {
    const ref = createRef<HumanCheckHandle>()

    render(<HumanCheck ref={ref} action={action} />)

    return ref
}

const startCheck = (ref: ReturnType<typeof renderCheck>) => {
    let token: Promise<string> | undefined

    act(() => {
        token = ref.current?.getToken()
    })

    return token as Promise<string>
}

describe('HumanCheck', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('runs only when asked, and stays hidden unless Cloudflare needs a click', () => {
        renderCheck()

        expect(mockOptions).toMatchObject({ execution: 'execute', appearance: 'interaction-only' })
        expect(mockExecute).not.toHaveBeenCalled()
    })

    it('resolves with a fresh token when asked, resetting the widget first because a token works once', async () => {
        const ref = renderCheck()
        const token = startCheck(ref)

        expect(mockReset).toHaveBeenCalled()
        expect(mockExecute).toHaveBeenCalled()
        expect(mockReset.mock.invocationCallOrder[0]).toBeLessThan(mockExecute.mock.invocationCallOrder[0])

        act(() => screen.getByRole('button', { name: 'Pass the check' }).click())

        await expect(token).resolves.toBe(mockToken)
    })

    it('says what to do only while Cloudflare asks for a click', () => {
        const ref = renderCheck()

        startCheck(ref)

        expect(screen.queryByText(INTERACTION_HINT)).not.toBeInTheDocument()

        act(() => screen.getByRole('button', { name: 'Ask for a click' }).click())

        expect(screen.getByText(INTERACTION_HINT)).toBeInTheDocument()

        act(() => screen.getByRole('button', { name: 'Finish the click' }).click())

        expect(screen.queryByText(INTERACTION_HINT)).not.toBeInTheDocument()
    })

    it('names the action it guards when it asks for a click', () => {
        const ref = renderCheck('send your message')

        startCheck(ref)
        act(() => screen.getByRole('button', { name: 'Ask for a click' }).click())

        expect(screen.getByText('Confirm you’re human to send your message.')).toBeInTheDocument()
    })

    it('fails the run and blames loading when the widget errors before it ever loaded', async () => {
        const ref = renderCheck()
        const token = startCheck(ref)

        act(() => screen.getByRole('button', { name: 'Fail the check' }).click())

        await expect(token).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))
        expect(screen.getByText(FAILURE_HINT)).toBeInTheDocument()
    })

    it.each(['Fail the check', 'Expire the challenge', 'Time out the challenge'])(
        'says the check didn’t pass, not that it couldn’t load, when a loaded widget ends with “%s”',
        async (outcome) => {
            const ref = renderCheck()

            act(() => screen.getByRole('button', { name: 'Load the widget' }).click())
            const token = startCheck(ref)
            act(() => screen.getByRole('button', { name: outcome }).click())

            await expect(token).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))
            expect(screen.getByText(describeRequestError(RequestErrorCode.ChallengeFailed))).toBeInTheDocument()
            expect(screen.queryByText(FAILURE_HINT)).not.toBeInTheDocument()
        },
    )

    it('starts a check asked for before the widget loaded once it has', () => {
        const ref = renderCheck()

        startCheck(ref)
        mockExecute.mockClear()
        act(() => screen.getByRole('button', { name: 'Load the widget' }).click())

        expect(mockExecute).toHaveBeenCalledTimes(1)
    })

    it('fails the run when the check never finishes on its own, e.g. a blocked Cloudflare script', async () => {
        jest.useFakeTimers()
        const ref = renderCheck()
        const token = startCheck(ref)
        const outcome = expect(token).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))

        act(() => {
            jest.advanceTimersByTime(60 * 1000)
        })

        await outcome
        expect(screen.getByText(FAILURE_HINT)).toBeInTheDocument()
    })

    it('waits for a visitor who is answering a challenge, however long it takes', async () => {
        jest.useFakeTimers()
        const ref = renderCheck()
        const token = startCheck(ref)

        act(() => screen.getByRole('button', { name: 'Ask for a click' }).click())
        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000)
        })
        act(() => screen.getByRole('button', { name: 'Pass the check' }).click())

        await expect(token).resolves.toBe(mockToken)
    })

    it.each(['Expire the challenge', 'Time out the challenge'])(
        'fails the run when Cloudflare ends the challenge: %s',
        async (callback) => {
            const ref = renderCheck()
            const token = startCheck(ref)

            act(() => screen.getByRole('button', { name: 'Ask for a click' }).click())
            act(() => screen.getByRole('button', { name: callback }).click())

            await expect(token).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))
            expect(screen.queryByText(INTERACTION_HINT)).not.toBeInTheDocument()
            expect(screen.getByText(FAILURE_HINT)).toBeInTheDocument()
        },
    )

    it('limits the wait again once the visitor has answered a challenge', async () => {
        jest.useFakeTimers()
        const ref = renderCheck()
        const token = startCheck(ref)
        const outcome = expect(token).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))

        act(() => screen.getByRole('button', { name: 'Ask for a click' }).click())
        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000)
        })
        act(() => screen.getByRole('button', { name: 'Finish the click' }).click())
        act(() => {
            jest.advanceTimersByTime(60 * 1000)
        })

        await outcome
    })

    it('gives a check asked for again its own full wait, not what was left of the one it replaced', async () => {
        jest.useFakeTimers()
        const ref = renderCheck()
        const first = startCheck(ref)
        const firstOutcome = expect(first).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))

        act(() => {
            jest.advanceTimersByTime(20 * 1000)
        })
        const second = startCheck(ref)

        await firstOutcome
        act(() => {
            jest.advanceTimersByTime(15 * 1000)
        })
        act(() => screen.getByRole('button', { name: 'Pass the check' }).click())

        await expect(second).resolves.toBe(mockToken)
    })

    it('fails a pending check and stops its timer when it unmounts', async () => {
        jest.useFakeTimers()
        const ref = createRef<HumanCheckHandle>()
        const { unmount } = render(<HumanCheck ref={ref} action="start the analysis" />)
        const token = startCheck(ref)

        unmount()

        await expect(token).rejects.toEqual(new ApiRequestError(RequestErrorCode.ChallengeFailed))
        expect(jest.getTimerCount()).toBe(0)
    })
})
