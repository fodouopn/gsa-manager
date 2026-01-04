/**
 * Centralized API client with error handling and token management
 */
import axios from 'axios'

// Get base URL from environment variable (production) or use relative path (development)
const baseURL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh')
        if (refreshToken) {
          // Use axios directly (not api instance) to avoid infinite loop
          // The Vite proxy will handle /api/* routing
          const response = await axios.post('/api/auth/refresh/', {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('token', access)
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`
          originalRequest.headers['Authorization'] = `Bearer ${access}`

          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle 403 Forbidden - permission denied
    if (error.response?.status === 403) {
      const errorMessage =
        error.response?.data?.detail ||
        "Vous n'avez pas la permission d'effectuer cette action"
      // You can show a toast notification here
      console.error('Permission denied:', errorMessage)
    }

    return Promise.reject(error)
  }
)

export default api

