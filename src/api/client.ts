import { toApiRequestError } from '@/api/errors'
import { config } from '@/config'
import axios from 'axios'

// The session travels as an httpOnly cookie shared by www. and api. (same site), so requests only need credentials.
export const api = axios.create({ baseURL: config.apiBaseUrl, withCredentials: true })

api.interceptors.response.use(undefined, (error) => Promise.reject(toApiRequestError(error)))
