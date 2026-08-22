// Curated primary-color candidates for the harness preset select. The primary seeds antd's whole
// palette, so switching here recolors the entire app (and the primary-derived ambient backdrop).
export interface PrimaryPreset {
    name: string
    value: string
}

export const PRIMARY_PRESETS: PrimaryPreset[] = [
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Teal', value: '#0d9488' },
    { name: 'Pine', value: '#0f766e' },
    { name: 'Terracotta', value: '#c2410c' },
    { name: 'Amber', value: '#d97706' },
    { name: 'Graphite', value: '#334155' },
]
