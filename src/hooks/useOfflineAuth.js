/**
 * useOfflineAuth.js — Gestion du verrouillage PIN hors ligne
 *
 * Corrections v2 :
 *  - Reçoit online en paramètre (pas navigator.onLine)
 *  - checkLockState ne se déclenche qu'une fois la valeur online stabilisée
 *  - Session TTL vérifiée correctement
 */
import { useState, useEffect, useCallback } from 'react'
import {
  hasPin, verifyPin, setUnlocked,
  getUnlockedAt, isOfflineEnabled,
} from '../indexeddb/settingsDB'

const SESSION_TTL = 8 * 60 * 60 * 1000 // 8h

export function useOfflineAuth(user, online) {
  const [locked,       setLocked]       = useState(false)
  const [checking,     setChecking]     = useState(true)
  const [pinError,     setPinError]     = useState('')
  const [pinVerifying, setPinVerifying] = useState(false)

  const checkLockState = useCallback(async () => {
    setChecking(true)
    try {
      // En ligne ou pas d'utilisateur → jamais verrouillé
      if (online || !user?.id) {
        setLocked(false)
        return
      }

      const [offlineEnabled, pinExists] = await Promise.all([
        isOfflineEnabled(),
        hasPin(),
      ])

      if (!offlineEnabled || !pinExists) {
        setLocked(false)
        return
      }

      // Vérifie si la session PIN est encore valide (< 8h)
      const unlockedAt = await getUnlockedAt()
      if (unlockedAt) {
        const age = Date.now() - new Date(unlockedAt).getTime()
        if (age < SESSION_TTL) {
          setLocked(false)
          return
        }
      }

      setLocked(true)
    } catch (e) {
      console.error('[useOfflineAuth]', e)
      setLocked(false)
    } finally {
      setChecking(false)
    }
  }, [online, user?.id])

  // Re-check à chaque changement de connectivité ou d'utilisateur
  useEffect(() => {
    checkLockState()
  }, [checkLockState])

  // Retour en ligne → déverrouillage automatique
  useEffect(() => {
    if (online) setLocked(false)
  }, [online])

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
      setPinError('Erreur de vérification.')
      return false
    } finally {
      setPinVerifying(false)
    }
  }, [user?.id])

  return { locked, checking, pinError, pinVerifying, submitPin, setPinError }
}
