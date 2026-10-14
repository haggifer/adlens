import { PRESET_NAME_MAX_LENGTH } from 'adlens-shared'
import type { z } from 'zod'

export const PRESET_NAME_REQUIRED_COPY = 'Enter a name for the preset'

export const PRESET_NAME_TOO_LONG_COPY = `Keep the name to ${PRESET_NAME_MAX_LENGTH} characters`

// The API's name rule: names are trimmed and compared ignoring case.
const toNameKey = (name: string) => name.trim().toLowerCase()

export const isSameName = (a: string, b: string): boolean => toNameKey(a) === toNameKey(b)

// The rules come from the shared schema; only the wording is the form's own, never zod's.
export const describePresetNameIssue: z.core.$ZodErrorMap = (issue) => {
    if (issue.path?.[0] !== 'name') {
        return undefined
    }

    return issue.code === 'too_big' ? PRESET_NAME_TOO_LONG_COPY : PRESET_NAME_REQUIRED_COPY
}
