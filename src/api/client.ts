import axios from 'axios'
import { getBearerToken } from '@/auth/authClient'

// Every request carries the Better Auth bearer token so the API can verify the session and apply the
// field allowlist. All record writes go through the API — the client never writes the database directly.
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL })

api.interceptors.request.use((config) => {
    const token = getBearerToken()

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api
