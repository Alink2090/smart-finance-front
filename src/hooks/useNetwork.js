/**
 * useNetwork.js — Détection de connectivité réseau
 * 
 * Va au-delà de navigator.onLine (qui est souvent inexact) :
 * fait un vrai ping vers l'API pour confirmer la connectivité réelle.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const PING_URL      = `${import.meta.env.VITE_API_URL}/Api_Gestion/health/` 
const PING_INTERVAL = 30_000  // vérification toutes les 30s
const PING_TIMEOUT  = 5_000   // timeout 5s

async function checkConnectivity() {
  // navigator.onLine = false → forcément offline
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT)
    // HEAD request : léger, ne charge rien
    const res = await fetch(PING_URL, {
      method: 'HEAD', cache: 'no-store', signal: ctrl.signal,
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    // Si l'API n'a pas de /health/, on teste avec une simple requête réseau
    try {
      const ctrl2 = new AbortController()
      setTimeout(() => ctrl2.abort(), PING_TIMEOUT)
      await fetch('https://www.gstatic.com/generate_204', {
        method: 'HEAD', cache: 'no-store', mode: 'no-cors', signal: ctrl2.signal,
      })
      return true
    } catch { return false }
  }
}

export function useNetwork() {
  const [online,      setOnline]      = useState(navigator.onLine)
  const [wasOffline,  setWasOffline]  = useState(false)
  const [justCameBack, setJustCameBack] = useState(false)
  const prevOnline = useRef(navigator.onLine)
  const timerRef   = useRef(null)

  const verify = useCallback(async () => {
    const isOnline = await checkConnectivity()
    setOnline(prev => {
      if (!prev && isOnline) {
        // Vient de revenir online
        setWasOffline(true)
        setJustCameBack(true)
        // Reset "justCameBack" après 8s (durée de la bannière de sync)
        setTimeout(() => setJustCameBack(false), 8_000)
      }
      prevOnline.current = isOnline
      return isOnline
    })
  }, [])

  useEffect(() => {
    const handleOnline  = () => verify()
    const handleOffline = () => { setOnline(false); prevOnline.current = false }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Polling périodique (utile quand les events natifs ne se déclenchent pas)
    timerRef.current = setInterval(verify, PING_INTERVAL)
    verify() // vérification initiale

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(timerRef.current)
    }
  }, [verify])

  return {
    /** true si connecté au réseau */
    online,
    /** true si l'app était offline à un moment de la session */
    wasOffline,
    /** true pendant 8s juste après le retour en ligne */
    justCameBack,
    /** Force une vérification immédiate */
    checkNow: verify,
  }
}
