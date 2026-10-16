import { create } from 'zustand'

interface LiveStore {
    // The live connection dropped and Ably is trying again: changes made meanwhile reach this tab only on its next read.
    isConnectionLost: boolean
    setIsConnectionLost: (isConnectionLost: boolean) => void
}

export const useLiveStore = create<LiveStore>()((set) => ({
    isConnectionLost: false,
    setIsConnectionLost: (isConnectionLost) => set({ isConnectionLost }),
}))
