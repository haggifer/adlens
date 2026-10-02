import { api } from '@/api/client'
import type { CreateContactUploadsInput, CreateContactUploadsResponse, SendContactMessageInput } from 'adlens-shared'

export const createContactUploads = async (input: CreateContactUploadsInput): Promise<CreateContactUploadsResponse> => {
    const { data } = await api.post<CreateContactUploadsResponse>('/v1/contact/uploads', input)

    return data
}

export const sendContactMessage = async (input: SendContactMessageInput): Promise<void> => {
    await api.post('/v1/contact', input)
}
