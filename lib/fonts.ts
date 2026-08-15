import { Inter, Michroma, Sora } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], display: 'swap', variable: '--font-sora' })
const michroma = Michroma({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-michroma' })

// Fixed roles: body/UI = Inter, headings/promo = Sora, logo wordmark = Michroma.
export const BODY_FONT_STACK = 'var(--font-inter), system-ui, -apple-system, sans-serif'
export const HEADING_FONT_STACK = `var(--font-sora), ${BODY_FONT_STACK}`
export const LOGO_FONT_STACK = `var(--font-michroma), ${HEADING_FONT_STACK}`

const LOADED_FONTS = [inter, sora, michroma]

export const FONT_VARIABLE_CLASSES = LOADED_FONTS.map((font) => font.variable).join(' ')
