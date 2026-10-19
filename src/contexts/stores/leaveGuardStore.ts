import { create } from 'zustand'

interface LeaveGuardStore {
    // The page holds something leaving it would lose: a video picked on the home page.
    isGuarded: boolean
    setIsGuarded: (isGuarded: boolean) => void
}

export const useLeaveGuardStore = create<LeaveGuardStore>()((set) => ({
    isGuarded: false,
    setIsGuarded: (isGuarded) => set({ isGuarded }),
}))
