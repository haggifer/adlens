import type { SendContactMessageInput } from 'adlens-shared'
import { api } from '@/api/client'

export const sendContactMessage = async (input: SendContactMessageInput): Promise<void> => {
    await api.post('/v1/contact', input)
}
