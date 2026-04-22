import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session on app load ───────────────────────────────────────────
  useEffect(() => {
    const token    = localStorage.getItem('token')
    const userdata = localStorage.getItem('userdata')
    if (!token) { setLoading(false); return }
    authAPI.profile({ userdata })
      .then(data => setUser(data?.user ?? data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  // ── Listen for 401 fired by API interceptor ───────────────────────────────
  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  // ── LOGIN étape 1 : vérifie credentials → envoie OTP ─────────────────────
  // Appelée par Login.jsx au submit du formulaire email/password
  const sendLoginOtp = useCallback(async (email, password) => {
    await authAPI.sendLoginOtp({ email, password })
    // Lance juste la requête — le composant gère le passage à l'étape OTP
  }, [])

  // ── LOGIN étape 2 : vérifie OTP → connecte ───────────────────────────────
  // Appelée par Login.jsx au submit du formulaire OTP
  const login = useCallback(async (email, password, otp) => {
    const res = await authAPI.login({ email, password, otp })

    const token    = res.token ?? res.access_token
    const userData = res.user  ?? res.data

    if (!token) throw new Error('No token received from server')

    localStorage.setItem('token',    token)
    localStorage.setItem('userdata', JSON.stringify(userData))

    setUser(userData)
    return userData
  }, [])

  // ── REGISTER étape 1 : envoie OTP ────────────────────────────────────────
  const sendRegisterOtp = useCallback(async (email, name) => {
    await authAPI.sendRegisterOtp({ email, name })
  }, [])

  // ── REGISTER étape 2 : vérifie OTP → crée le compte ──────────────────────
  const register = useCallback(async (formData) => {
    // formData = { name, email, password, otp }
    const res = await authAPI.register(formData)

    // Le register ne retourne pas de token (l'utilisateur doit se connecter)
    // Si ton backend retourne un token directement, décommente ces lignes :
    // const token = res.token ?? res.access_token
    // if (token) { localStorage.setItem('token', token); setUser(res.user) }

    return res
  }, [])

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userdata')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading,
      sendLoginOtp, login,       // login en 2 étapes
      sendRegisterOtp, register, // register en 2 étapes
      logout, setUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}