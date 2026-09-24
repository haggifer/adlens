import { create } from 'zustand'

interface ContactModalStore {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

export const useContactModalStore = create<ContactModalStore>()((set) => ({
    isOpen: false,
    setIsOpen: (isOpen) => set({ isOpen }),
}))
