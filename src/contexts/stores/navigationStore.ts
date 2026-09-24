import { create } from 'zustand'

interface NavigationStore {
    landingPath: string | null
    // Whether the browser's previous history entry is a page of this app, so "Back" can't leave the site.
    hasNavigated: boolean
    trackPath: (path: string) => void
}

export const useNavigationStore = create<NavigationStore>()((set) => ({
    landingPath: null,
    hasNavigated: false,
    trackPath: (path) =>
        set((s) => {
            if (s.landingPath === null) {
                return { landingPath: path }
            }

            return path === s.landingPath ? s : { hasNavigated: true }
        }),
}))
