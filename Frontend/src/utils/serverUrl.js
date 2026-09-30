// Backend base URL without the /api part (used for /uploads/... file links)
export const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')