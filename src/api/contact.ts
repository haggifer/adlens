import type { ContactMessageInput } from 'adlens-shared'
import api from '@/api/client'

export const sendContactMessage = async (input: ContactMessageInput): Promise<void> => {
    await api.post('/v1/contact', input)
}
