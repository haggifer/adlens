import type { MediaPlayerInstance } from '@vidstack/react'

type PlayFromPlayer = Pick<MediaPlayerInstance, 'state' | 'listen' | 'play' | 'currentTime'>

// Vidstack's own margin: a video this close to its end counts as ended when it is played.
const END_MARGIN_S = 0.1

// Long enough for a seek into a part not loaded yet; short enough that a seek Vidstack skipped (to the time it already
// holds) doesn't leave the click waiting.
const SEEK_WAIT_MS = 5000

const waitFor = (player: PlayFromPlayer, type: 'can-play' | 'seeked', timeoutMs?: number): Promise<void> =>
    new Promise((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const dispose = player.listen(
            type,
            () => {
                clearTimeout(timer)
                resolve()
            },
            { once: true },
        )

        if (timeoutMs) {
            timer = setTimeout(() => {
                dispose()
                resolve()
            }, timeoutMs)
        }
    })

// Plays the video from `seconds`. Vidstack restarts a video it holds as ended (or at its very end) whenever it is
// played, and learns that a seek left the end only once the seek completes; before the player can play, it holds a seek
// back and refuses to play. So the time is set once the player can play, and play waits for the seek off the end.
export const playFrom = async (player: PlayFromPlayer, seconds: number): Promise<void> => {
    if (!player.state.canPlay) {
        await waitFor(player, 'can-play')
    }

    const { ended, duration, currentTime } = player.state
    const isAtEnd = ended || duration - currentTime < END_MARGIN_S

    player.currentTime = seconds

    if (isAtEnd) {
        await waitFor(player, 'seeked', SEEK_WAIT_MS)
    }

    await player.play()
}
