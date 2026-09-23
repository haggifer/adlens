import { z } from 'zod'

// Mirrors the API's Better Auth `minPasswordLength`.
export const MIN_PASSWORD_LENGTH = 8

export const newPasswordSchema = z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`)

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
