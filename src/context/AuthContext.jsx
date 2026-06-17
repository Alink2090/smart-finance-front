import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI }   from '../services/api'
import { warmCache } from '../sync/cacheWarmer'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // EN LIGNE : on ne restaure JAMAIS la session depuis localStorage.
    // L'utilisateur doit toujours s'authentifier avec email + OTP.
    // EN HORS LIGNE : on restaure la session pour permettre le PIN.
    if (navigator.onLine) {
      // Online → force reconnexion, efface toute session précédente
      _clearSession()
      setLoading(false)
      return
    }

    // Offline → restaure le profil depuis localStorage pour le PIN screen
    const userdata = localStorage.getItem('userdata')
    if (!userdata) { setLoading(false); return }
    try {
      setUser(JSON.parse(userdata))
    } catch {
      _clearSession()
    }
    setLoading(false)
  }, [])

  // 401 global : déconnecte immédiatement
  useEffect(() => {
    const handler = () => { _clearSession(); setUser(null) }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const sendLoginOtp = useCallback(async (email, password) => {
    return authAPI.sendLoginOtp({ email, password })
  }, [])

  const login = useCallback(async (email, password, otp) => {
    const res      = await authAPI.login({ email, password, otp })
    const token    = res?.token ?? res?.access_token
    const userData = res?.user  ?? res?.data ?? res

    if (!token) throw new Error('Token manquant dans la réponse serveur')

    localStorage.setItem('token',    token)
    localStorage.setItem('userdata', JSON.stringify(userData))
    setUser(userData)
    warmCache(userData).catch(() => {})
    return userData
  }, [])

  const sendRegisterOtp = useCallback(async (email, name) => {
    return authAPI.sendRegisterOtp({ email, name })
  }, [])

  const register = useCallback(async (formData) => {
    return authAPI.register(formData)
  }, [])

  const logout = useCallback(() => {
    _clearSession()
    setUser(null)
    authAPI.logout?.().catch(() => {})
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sendLoginOtp, sendRegisterOtp, register }}>
      {children}
    </AuthContext.Provider>
  )
}

function _clearSession() {
  localStorage.removeItem('token')
  // On NE supprime PAS userdata — nécessaire pour le PIN offline
}
