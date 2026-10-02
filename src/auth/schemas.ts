import { MIN_PASSWORD_LENGTH } from 'adlens-shared'
import { z } from 'zod'

// Doubles as the too-short error, so the hint and the error always agree.
export const NEW_PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters`

const newPasswordSchema = z.string().min(MIN_PASSWORD_LENGTH, NEW_PASSWORD_HINT)

// A new password typed twice; the mismatch is reported on `confirm`.
export const newPasswordFieldsSchema = z
    .object({
        password: newPasswordSchema,
        confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    })
