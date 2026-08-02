import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Server origin without the /api suffix, for building URLs to statically
// served files (uploaded listing images) rather than JSON endpoints.
export const ASSET_BASE_URL = API_URL.replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
