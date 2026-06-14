import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI }   from '../services/api'
import { warmCache } from '../sync/cacheWarmer'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session on app load ───────────────────────────────────────────
  useEffect(() => {
    const token    = localStorage.getItem('token')
    const userdata = localStorage.getItem('userdata')

    // Pas de token → pas connecté, affiche immédiatement
    if (!token) {
      setLoading(false)
      return
    }

    // ✅ CORRECTION CLÉ : restaure l'utilisateur depuis localStorage IMMÉDIATEMENT
    // sans attendre le réseau → plus d'écran noir
    if (userdata) {
      try {
        const parsed = JSON.parse(userdata)
        setUser(parsed)
      } catch {}
    }
    // Fin du loading immédiat — l'app s'affiche tout de suite
    setLoading(false)

    // Validation silencieuse en arrière-plan (pas bloquante)
    // Si le token est expiré → logout propre
    authAPI.profile({ userdata })
      .then(data => {
        const u = data?.user ?? data
        if (u) {
          setUser(u)
          localStorage.setItem('userdata', JSON.stringify(u))
          if (navigator.onLine) warmCache(u).catch(() => {})
        }
      })
      .catch(err => {
        // 401 = token expiré → logout
        // Autre erreur réseau → on garde la session locale (mode offline)
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          localStorage.removeItem('token')
          localStorage.removeItem('userdata')
          setUser(null)
        }
        // Sinon : on reste connecté avec les données locales
      })
  }, [])

  // ── Listen for 401 fired by API interceptor ───────────────────────────────
  useEffect(() => {
    const handler = () => {
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('userdata')
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  // ── LOGIN étape 1 : envoie OTP ────────────────────────────────────────────
  const sendLoginOtp = useCallback(async (email, password) => {
    await authAPI.sendLoginOtp({ email, password })
  }, [])

  // ── LOGIN étape 2 : vérifie OTP → connecte ───────────────────────────────
  const login = useCallback(async (email, password, otp) => {
    const res = await authAPI.login({ email, password, otp })

    const token    = res.token ?? res.access_token
    const userData = res.user  ?? res.data

    if (!token) throw new Error('No token received from server')

    localStorage.setItem('token',    token)
    localStorage.setItem('userdata', JSON.stringify(userData))
    setUser(userData)
    warmCache(userData).catch(e => console.warn('[CacheWarmer]', e))
    return userData
  }, [])

  // ── REGISTER étape 1 ──────────────────────────────────────────────────────
  const sendRegisterOtp = useCallback(async (email, name) => {
    await authAPI.sendRegisterOtp({ email, name })
  }, [])

  // ── REGISTER étape 2 ──────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    return authAPI.register(formData)
  }, [])

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userdata')
    setUser(null)
    authAPI.logout?.().catch(() => {})
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, logout,
      sendLoginOtp, sendRegisterOtp, register,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
