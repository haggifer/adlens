// Each id's visual lives in components/background/styles.ts, keyed by the data-ambient attribute.
export enum AmbientId {
    Solid = 'solid',
    Aurora = 'aurora',
    Mesh = 'mesh',
    Glow = 'glow',
    Beams = 'beams',
    Grid = 'grid',
    Dots = 'dots',
    Grain = 'grain',
}

export interface AmbientOption {
    id: AmbientId
    name: string
}

export const AMBIENT_BACKGROUNDS: AmbientOption[] = [
    { id: AmbientId.Solid, name: 'Solid' },
    { id: AmbientId.Aurora, name: 'Aurora' },
    { id: AmbientId.Mesh, name: 'Mesh' },
    { id: AmbientId.Glow, name: 'Glow' },
    { id: AmbientId.Beams, name: 'Beams' },
    { id: AmbientId.Grid, name: 'Grid' },
    { id: AmbientId.Dots, name: 'Dots' },
    { id: AmbientId.Grain, name: 'Grain' },
]

export const DEFAULT_AMBIENT_ID = AmbientId.Glow
