export type ColorScheme = 'light' | 'dark'

export interface InitialScheme {
    scheme: ColorScheme
    // Whether the user picked the scheme; otherwise the app keeps following the system preference.
    isStored: boolean
}
