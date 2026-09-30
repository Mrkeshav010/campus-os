import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  })

  const saveSession = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  // identifier = email OR roll number
  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password })
    saveSession(data)
    return data.user
  }

  // Staff accounts come back without a token (waiting for admin approval)
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    if (data.token) {
      saveSession(data)
      return { pending: false, user: data.user }
    }
    return { pending: true, message: data.message }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)