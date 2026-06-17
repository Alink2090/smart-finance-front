/**
 * useOfflineAuth.js
 *
 * Règles :
 *  - ONLINE  → jamais de PIN. Login email+OTP obligatoire à chaque ouverture.
 *  - OFFLINE + pas de PIN configuré → accès REFUSÉ (pas de mode offline sans PIN)
 *  - OFFLINE + PIN configuré → PIN demandé à chaque ouverture d'app OU après 5 min d'inactivité
 *
 * "Ouverture d'app" = visibilitychange (retour sur l'onglet/app depuis le background)
 * "5 min" = si l'app reste ouverte en foreground sans interaction
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  hasPin, verifyPin, setUnlocked,
  getUnlockedAt, isOfflineEnabled,
} from '../indexeddb/settingsDB'

const LOCK_AFTER_MS  = 5 * 60 * 1000  // 5 min d'inactivité → verrouille

export function useOfflineAuth(user, online) {
  const [locked,       setLocked]       = useState(false)
  const [checking,     setChecking]     = useState(true)
  const [noPin,        setNoPin]        = useState(false)  // offline sans PIN configuré
  const [pinError,     setPinError]     = useState('')
  const [pinVerifying, setPinVerifying] = useState(false)
  const inactivityTimer = useRef(null)

  // ── Vérifie si l'app doit être verrouillée ────────────────────────────────
  const checkLock = useCallback(async () => {
    setChecking(true)
    try {
      // Online → pas de PIN (reconnexion normale gère la sécurité)
      if (online || !user?.id) {
        setLocked(false)
        setNoPin(false)
        return
      }

      // Offline : le PIN est OBLIGATOIRE
      const [offlineEnabled, pinExists] = await Promise.all([
        isOfflineEnabled(),
        hasPin(),
      ])

      // Offline sans PIN ou mode offline désactivé → accès refusé
      if (!offlineEnabled || !pinExists) {
        setNoPin(true)
        setLocked(true)
        return
      }

      setNoPin(false)

      // Vérifie si la session PIN est encore fraîche (< 5 min)
      const unlockedAt = await getUnlockedAt()
      if (unlockedAt) {
        const age = Date.now() - new Date(unlockedAt).getTime()
        if (age < LOCK_AFTER_MS) {
          setLocked(false)
          return
        }
      }

      // Session expirée ou jamais déverrouillée → verrou
      setLocked(true)
    } catch {
      setLocked(false)
    } finally {
      setChecking(false)
    }
  }, [online, user?.id])

  // Check initial + à chaque changement de connectivité
  useEffect(() => { checkLock() }, [checkLock])

  // ── Verrouillage à la sortie de l'app (background) ────────────────────────
  useEffect(() => {
    if (online) return  // pas de gestion PIN en ligne

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // L'app part en background → on efface le timestamp unlock
        // Au retour, checkLock verra que unlocked_at est trop vieux (ou absent)
        import('../indexeddb/settingsDB').then(m => m.clearUnlocked?.().catch(() => {}))
        clearTimeout(inactivityTimer.current)
      } else if (document.visibilityState === 'visible') {
        // Retour en foreground → re-vérifie le verrou
        checkLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [online, checkLock])

  // ── Timer d'inactivité 5 min ──────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (online || !user?.id) return
    clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(async () => {
      const { clearUnlocked } = await import('../indexeddb/settingsDB')
      await clearUnlocked().catch(() => {})
      setLocked(true)
    }, LOCK_AFTER_MS)
  }, [online, user?.id])

  // Lance le timer après déverrouillage
  useEffect(() => {
    if (!locked && !online && user?.id) {
      resetInactivityTimer()
      // Écoute les interactions utilisateur pour remettre le timer à zéro
      const events = ['touchstart', 'click', 'keydown']
      events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }))
      return () => {
        events.forEach(e => window.removeEventListener(e, resetInactivityTimer))
        clearTimeout(inactivityTimer.current)
      }
    }
  }, [locked, online, user?.id, resetInactivityTimer])

  // Retour en ligne → déverrouille (l'auth serveur prend le relais)
  useEffect(() => {
    if (online) { setLocked(false); setNoPin(false) }
  }, [online])

  // ── Soumission du PIN ────────────────────────────────────────────────────
  const submitPin = useCallback(async (pin) => {
    setPinError('')
    setPinVerifying(true)
    try {
      const ok = await verifyPin(user?.id ?? 'user', pin)
      if (ok) {
        await setUnlocked()
        setLocked(false)
        return true
      }
      setPinError('PIN incorrect. Réessayez.')
      return false
    } catch {
      setPinError('Erreur lors de la vérification.')
      return false
    } finally {
      setPinVerifying(false)
    }
  }, [user?.id])

  return { locked, checking, noPin, pinError, pinVerifying, submitPin, setPinError }
}
