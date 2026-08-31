import axios from 'axios'
import { auth } from '@/firebase/config'

// Every request carries the caller's Firebase ID token so the backend can verify identity (Admin SDK)
// and apply the field allowlist. All record writes go through here — clients never write Firestore directly.
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL })

api.interceptors.request.use(async (config) => {
    const token = await auth.currentUser?.getIdToken()

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api
