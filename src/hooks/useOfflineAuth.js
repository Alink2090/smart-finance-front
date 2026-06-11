/**
 * useOfflineAuth.js — Gestion du verrouillage PIN hors ligne
 * Détermine si l'écran PIN doit être affiché au démarrage.
 */
import { useState, useEffect, useCallback } from 'react'
import { hasPin, verifyPin, setUnlocked, getUnlockedAt, clearUnlocked, isOfflineEnabled } from '../indexeddb/settingsDB'
import { useNetwork } from './useNetwork'

const SESSION_TTL = 8 * 60 * 60 * 1000 // 8h — session PIN valide

export function useOfflineAuth(user) {
  const { online } = useNetwork()
  const [locked,       setLocked]       = useState(false)
  const [checking,     setChecking]     = useState(true)
  const [pinError,     setPinError]     = useState('')
  const [pinVerifying, setPinVerifying] = useState(false)

  const checkLockState = useCallback(async () => {
    setChecking(true)
    try {
      // Pas de verrou si online ou pas d'utilisateur
      if (online || !user) { setLocked(false); return }

      const offlineEnabled = await isOfflineEnabled()
      if (!offlineEnabled) { setLocked(false); return }

      const pinExists = await hasPin()
      if (!pinExists) { setLocked(false); return }

      // Vérifie si la session PIN est encore valide
      const unlockedAt = await getUnlockedAt()
      if (unlockedAt) {
        const age = Date.now() - new Date(unlockedAt).getTime()
        if (age < SESSION_TTL) { setLocked(false); return }
      }

      setLocked(true)
    } finally {
      setChecking(false)
    }
  }, [online, user])

  useEffect(() => { checkLockState() }, [checkLockState])

  // Quand on repasse online → déverrouille automatiquement
  useEffect(() => {
    if (online && locked) setLocked(false)
  }, [online, locked])

  const submitPin = useCallback(async (pin, userId) => {
    setPinError('')
    setPinVerifying(true)
    try {
      const ok = await verifyPin(userId ?? user?.id, pin)
      if (ok) {
        await setUnlocked()
        setLocked(false)
        return true
      } else {
        setPinError('PIN incorrect. Réessayez.')
        return false
      }
    } catch (e) {
      setPinError('Erreur de vérification.')
      return false
    } finally {
      setPinVerifying(false)
    }
  }, [user])

  return { locked, checking, pinError, pinVerifying, submitPin, setPinError }
}
