import { PRESET_NAME_MAX_LENGTH } from 'adlens-shared'
import type { z } from 'zod'

export const PRESET_NAME_REQUIRED_COPY = 'Enter a name for the preset'

export const PRESET_NAME_TOO_LONG_COPY = `Keep the name to ${PRESET_NAME_MAX_LENGTH} characters`

const INNER_WHITESPACE = /\s+/g

// The API's name rule, repeated exactly from its toNameKey so the clash check here asks what the API would refuse:
// Unicode NFKC, trimmed, every run of whitespace made one space, lowercased. So "Summer  Sale", "summer sale" and a
// full-width "Ｓummer Sale" are one name.
const toNameKey = (name: string) => name.normalize('NFKC').trim().replace(INNER_WHITESPACE, ' ').toLowerCase()

export const isSameName = (a: string, b: string): boolean => toNameKey(a) === toNameKey(b)

// The rules come from the shared schema; only the wording is the form's own, never zod's.
export const describePresetNameIssue: z.core.$ZodErrorMap = (issue) => {
    if (issue.path?.[0] !== 'name') {
        return undefined
    }

    return issue.code === 'too_big' ? PRESET_NAME_TOO_LONG_COPY : PRESET_NAME_REQUIRED_COPY
}
