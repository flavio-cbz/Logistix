// hooks/use-auth.ts
import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier l'authentification au chargement
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.warn('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (identifier: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      setUser(data.user)
      return { success: true }
    } else {
      const error = await response.json()
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.warn('Logout request failed:', error)
    } finally {
      setUser(null)
    }
  }

  return {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user
  }
}