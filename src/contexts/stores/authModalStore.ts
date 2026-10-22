import { create } from 'zustand'

export type AuthView = 'signin' | 'signup' | 'forgot' | 'confirm' | 'reset'

interface AuthModalStore {
    view: AuthView | null
    // Clears the other-address note, so it shows only when set after opening the confirmation view.
    setView: (view: AuthView | null) => void
    // The confirmation view was opened because the user opened a confirmation link for another address.
    isOtherAddressLink: boolean
    setIsOtherAddressLink: (value: boolean) => void
    resetToken: string | null
    setResetToken: (value: string | null) => void
}

export const useAuthModalStore = create<AuthModalStore>()((set) => ({
    view: null,
    setView: (view) => set({ view, isOtherAddressLink: false }),
    isOtherAddressLink: false,
    setIsOtherAddressLink: (value) => set({ isOtherAddressLink: value }),
    resetToken: null,
    setResetToken: (value) => set({ resetToken: value }),
}))
