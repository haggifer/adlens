import { create } from 'zustand'

export type AuthView = 'signin' | 'signup' | 'forgot'

interface AuthModalStore {
    view: AuthView | null
    setView: (view: AuthView | null) => void
}

export const useAuthModalStore = create<AuthModalStore>()((set) => ({
    view: null,
    setView: (view) => set({ view }),
}))
