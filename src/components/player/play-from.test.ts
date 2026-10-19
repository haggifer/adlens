import type { MediaPlayerInstance } from '@vidstack/react'
import { playFrom } from './play-from'

interface FakePlayerState {
    canPlay: boolean
    ended: boolean
    duration: number
    currentTime: number
}

// The parts of a Vidstack player playFrom uses, recording the order of the time change and play.
const createPlayer = (state: Partial<FakePlayerState> = {}) => {
    const target = new EventTarget()
    const calls: string[] = []
    const player = {
        state: { canPlay: true, ended: false, duration: 30, currentTime: 0, ...state },
        set currentTime(seconds: number) {
            calls.push(`seek ${seconds}`)
        },
        play: jest.fn(async () => {
            calls.push('play')
        }),
        listen: (type: string, handler: () => void, options?: AddEventListenerOptions) => {
            target.addEventListener(type, handler, options)

            return () => target.removeEventListener(type, handler)
        },
    }

    return {
        player: player as unknown as MediaPlayerInstance,
        calls,
        fire: (type: string) => target.dispatchEvent(new Event(type)),
    }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('playFrom', () => {
    it('seeks and plays at once while the video is short of its end', async () => {
        const { player, calls } = createPlayer({ currentTime: 12 })

        await playFrom(player, 20)

        expect(calls).toEqual(['seek 20', 'play'])
    })

    it.each([
        ['has ended', { ended: true, currentTime: 30 }],
        ['sits at its last moment', { currentTime: 29.95 }],
    ])('plays only once the seek has left the end when the video %s', async (_case, state) => {
        const { player, calls, fire } = createPlayer(state)

        const playing = playFrom(player, 20)
        await flush()

        expect(calls).toEqual(['seek 20'])

        fire('seeked')
        await playing

        expect(calls).toEqual(['seek 20', 'play'])
    })

    it('still plays when no seek follows, rather than leave the click waiting', async () => {
        jest.useFakeTimers()

        try {
            const { player, calls } = createPlayer({ ended: true, currentTime: 30 })

            const playing = playFrom(player, 30)
            await jest.advanceTimersByTimeAsync(5000)
            await playing

            expect(calls).toEqual(['seek 30', 'play'])
        } finally {
            jest.useRealTimers()
        }
    })

    it('waits until the player can play before it seeks', async () => {
        const { player, calls, fire } = createPlayer({ canPlay: false })

        const playing = playFrom(player, 20)
        await flush()

        expect(calls).toEqual([])

        fire('can-play')
        await playing

        expect(calls).toEqual(['seek 20', 'play'])
    })
})
