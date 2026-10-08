'use client'

import { Spin } from 'antd'
import dynamic from 'next/dynamic'
import { type ComponentProps, createContext, useContext } from 'react'
import { useStyles } from './styles'

// next/dynamic's loading component gets no props, so the player's class reaches it through context.
const PlayerClassContext = createContext<string | undefined>(undefined)

// Without the player's class the placeholder is only as big as the spinner, and a frame that hugs the player
// collapses around it until the chunk arrives.
const PlayerPlaceholder = () => {
    const { styles, cx } = useStyles()
    const className = useContext(PlayerClassContext)

    return (
        <div className={cx(className, styles.placeholder)}>
            <Spin />
        </div>
    )
}

// Vidstack and its stylesheets are a large share of a page's first load, and the home page shows no player until a
// video is chosen; loading them on first render keeps them off the critical path. Client-only: the player needs the
// browser's media APIs.
const VideoPlayer = dynamic(() => import('./VideoPlayer').then((module) => module.VideoPlayer), {
    ssr: false,
    loading: PlayerPlaceholder,
})

export function LazyVideoPlayer(props: ComponentProps<typeof VideoPlayer>) {
    return (
        <PlayerClassContext.Provider value={props.className}>
            <VideoPlayer {...props} />
        </PlayerClassContext.Provider>
    )
}
