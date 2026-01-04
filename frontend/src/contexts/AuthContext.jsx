import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import api from '../utils/api'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/users/me/')
      setUser(response.data)
      setLoading(false)
      return response.data
    } catch (error) {
      // Si erreur 401, le token est invalide ou expiré
      if (error.response?.status === 401) {
        // Ne pas logger l'erreur si c'est juste une session expirée
        // L'intercepteur de api.js gérera le refresh token
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
      } else {
        console.error('Error fetching user:', error)
      }
      setLoading(false)
      throw error
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser().catch(() => {
        // Erreur déjà gérée dans fetchUser
      })
    } else {
      setLoading(false)
    }
  }, [token, fetchUser])

  const login = async (username, password) => {
    try {
      // Utiliser axios directement pour le login (pas besoin de token)
      const response = await api.post('/auth/login/', {
        username,
        password,
      })
      const { access, refresh } = response.data
      localStorage.setItem('token', access)
      localStorage.setItem('refresh', refresh)
      setToken(access)
      await fetchUser()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erreur de connexion',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

