import { ANTD_THEMES } from '@/design/theme'
// The token math from antd's own modules, not its `theme` entry (a client module, only a reference on the server) nor
// `getDesignToken`, which caches through @ant-design/cssinjs and so creates a React context: the dev server evaluates
// this file for the page's metadata in the server-component layer, where createContext doesn't exist.
import defaultAlgorithm from 'antd/es/theme/themes/default'
import seedToken from 'antd/es/theme/themes/seed'
import formatToken from 'antd/es/theme/util/alias'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SITE_NAME } from './site-metadata'

interface HeadlinePart {
    text: string
    isAccent?: boolean
}

export const alt = 'AdLens: find out why your video ads underperform'

// The 1.91:1 size Facebook, LinkedIn and X's large card all crop least.
export const size = { width: 1200, height: 630 }

export const contentType = 'image/png'

// The hero's words and accents, so a shared link looks like the page it opens.
const HEADLINE: HeadlinePart[] = [
    { text: 'Find out' },
    { text: 'why', isAccent: true },
    { text: 'your video ads' },
    { text: 'underperform', isAccent: true },
]

const TAGLINE =
    'Checks video ads against platform ad policies and creative best practices, every finding timestamped and cited.'

const DOMAIN = 'useadlens.com'

const { token: LIGHT_TOKEN = {} } = ANTD_THEMES.light

// Light-scheme tokens, as antd derives them: the image is rendered once, for every viewer.
const TOKEN = formatToken({ ...defaultAlgorithm({ ...seedToken, ...LIGHT_TOKEN }), override: LIGHT_TOKEN })

// Satori reads TrueType or OpenType, not the WOFF2 next/font serves, so the brand fonts come from Google Fonts' CSS
// API, which hands TrueType to a client that doesn't ask for anything newer. Fetched once, when the image is built.
const loadGoogleFont = async (family: string, weight: number): Promise<ArrayBuffer> => {
    const response = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)
    const css = await response.text()
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]

    if (!fontUrl) {
        throw new Error(`Google Fonts returned no TrueType file for ${family} ${weight}`)
    }

    const font = await fetch(fontUrl)

    return font.arrayBuffer()
}

const loadLogoMark = async (): Promise<string> => {
    const svg = await readFile(join(process.cwd(), 'src/app/icon.svg'))

    return `data:image/svg+xml;base64,${svg.toString('base64')}`
}

const renderHeadlinePart = ({ text, isAccent }: HeadlinePart) => (
    <span key={text} style={{ marginRight: '0.25em', color: isAccent ? TOKEN.colorPrimary : TOKEN.colorTextHeading }}>
        {text}
    </span>
)

export default async function OpenGraphImage() {
    const [soraBold, soraRegular, michroma, logoMark] = await Promise.all([
        loadGoogleFont('Sora', 700),
        loadGoogleFont('Sora', 400),
        loadGoogleFont('Michroma', 400),
        loadLogoMark(),
    ])

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 80px',
                fontFamily: 'Sora',
                backgroundColor: TOKEN.colorBgLayout,
                backgroundImage: `radial-gradient(circle at 85% -10%, ${TOKEN.colorPrimaryBgHover}, ${TOKEN.colorBgLayout} 65%)`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> only */}
                <img src={logoMark} width={64} height={64} alt="" />
                <span style={{ fontFamily: 'Michroma', fontSize: 44, color: TOKEN.colorPrimary }}>{SITE_NAME}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        fontSize: 68,
                        fontWeight: 700,
                        lineHeight: 1.12,
                        letterSpacing: '-0.02em',
                    }}
                >
                    {HEADLINE.map(renderHeadlinePart)}
                </div>
                <div
                    style={{
                        display: 'flex',
                        maxWidth: 940,
                        fontSize: 30,
                        lineHeight: 1.4,
                        color: TOKEN.colorTextSecondary,
                    }}
                >
                    {TAGLINE}
                </div>
            </div>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: TOKEN.colorPrimary }}>{DOMAIN}</div>
        </div>,
        {
            ...size,
            fonts: [
                { name: 'Sora', data: soraBold, weight: 700, style: 'normal' },
                { name: 'Sora', data: soraRegular, weight: 400, style: 'normal' },
                { name: 'Michroma', data: michroma, weight: 400, style: 'normal' },
            ],
        },
    )
}
