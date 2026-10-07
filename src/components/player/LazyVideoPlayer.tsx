'use client'

import { Spin } from 'antd'
import dynamic from 'next/dynamic'

// Vidstack and its stylesheets are a large share of a page's first load, and the home page shows no player until a
// video is chosen; loading them on first render keeps them off the critical path. Client-only: the player needs the
// browser's media APIs.
export const LazyVideoPlayer = dynamic(() => import('./VideoPlayer').then((module) => module.VideoPlayer), {
    ssr: false,
    loading: () => <Spin className="m-auto" />,
})
