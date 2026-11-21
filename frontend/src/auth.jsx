import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // При открытии сайта спрашиваем у сервера: кто мы? (по куке входа)
  useEffect(() => {
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

    // Если сервер сообщил, что вход закончился, возвращаем пользователя на страницу входа
  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  const signIn = useCallback(async (login, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { login, password } })
    setUser(data.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}