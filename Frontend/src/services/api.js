import axios from 'axios'
import { enqueueOfflineWrite, isOfflineWriteMode } from '../hooks/useOfflineSync'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  const method = (config.method || 'get').toLowerCase()
  const mutating = ['post', 'put', 'patch', 'delete'].includes(method)
  // AI and exam requests must never be queued offline (they need the server live)
  const neverQueue = config.url?.includes('/ai/') || config.url?.includes('/exams')
  if (mutating && isOfflineWriteMode() && !neverQueue) {
    enqueueOfflineWrite(config)
    const err = new Error('Queued locally — Offline Sync is ON')
    err.isOfflineQueue = true
    return Promise.reject(err)
  }
  return config
})

// If the token is invalid/expired, clear the session and go to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.isOfflineQueue) return Promise.reject(err)
    const isLoginCall = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api