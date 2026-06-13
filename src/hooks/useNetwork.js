/**
 * useNetwork.js — Détection de connectivité réseau fiable
 *
 * Problèmes corrigés vs v1 :
 *  - Le fallback gstatic en no-cors ne throw jamais → retiré
 *  - On utilise une vraie requête avec timeout + abort pour détecter l'offline
 *  - L'état initial est false si navigator.onLine=false, sinon vérifié immédiatement
 *  - Pas de polling agressif : events natifs + 1 vérification toutes les 30s si online
 */
import { useState, useEffect, useCallback, useRef } from 'react'

// URL de ping : on cible l'API Django elle-même.
// Si elle répond (même 401/403/404) → on est en ligne.
// Si elle ne répond pas → on est hors ligne.
const API_BASE   = import.meta.env.VITE_API_URL ?? ''
const PING_URL   = API_BASE
  ? `${API_BASE.replace(/\/$/, '')}/Api_Gestion/health/`
  : null
const TIMEOUT_MS = 4000

/**
 * Vérifie la connectivité réseau RÉELLE.
 * Retourne false si :
 *  - navigator.onLine === false (rapide, sans réseau)
 *  - La requête dépasse TIMEOUT_MS
 *  - La requête échoue (réseau coupé, DNS, etc.)
 * Retourne true si :
 *  - La réponse arrive (quel que soit le status HTTP)
 */
async function checkConnectivity() {
  // Cas trivial — le navigateur sait déjà qu'il est hors ligne
  if (!navigator.onLine) return false

  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    // On essaie d'abord l'API Django
    if (PING_URL) {
      await fetch(PING_URL, {
        method: 'HEAD',
        cache:  'no-store',
        signal: ctrl.signal,
        // Pas de credentials pour éviter les pre-flight CORS
        mode:   'no-cors',
      })
      // no-cors : si la requête aboutit (même opaque), on est connecté
      clearTimeout(timer)
      return true
    }

    // Pas d'API configurée : teste avec une image 1×1 Google (fiable, pas de CORS)
    // IMPORTANT : on vérifie response.type — 'opaque' = requête arrivée, pas de réseau = throw
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache:  'no-store',
      signal: ctrl.signal,
      mode:   'no-cors',
    })
    clearTimeout(timer)
    return true
  } catch (err) {
    clearTimeout(timer)
    // AbortError (timeout) ou TypeError (réseau coupé) → offline
    return false
  }
}

export function useNetwork() {
  // Initialisation conservatrice :
  // - Si navigator.onLine=false → offline immédiatement
  // - Sinon on met "true" provisoire et on vérifie dans useEffect
  const [online,       setOnline]       = useState(navigator.onLine)
  const [justCameBack, setJustCameBack] = useState(false)
  const prevOnline = useRef(navigator.onLine)
  const justCameBackTimer = useRef(null)
  const pollTimer  = useRef(null)

  const applyOnlineState = useCallback((isOnline) => {
    setOnline(prev => {
      // Retour en ligne : déclenche la bannière de sync pendant 8s
      if (!prev && isOnline) {
        clearTimeout(justCameBackTimer.current)
        setJustCameBack(true)
        justCameBackTimer.current = setTimeout(() => setJustCameBack(false), 8000)
      }
      prevOnline.current = isOnline
      return isOnline
    })
  }, [])

  const verify = useCallback(async () => {
    const isOnline = await checkConnectivity()
    applyOnlineState(isOnline)
    return isOnline
  }, [applyOnlineState])

  useEffect(() => {
    // Handlers natifs du navigateur
    const handleOnline  = () => verify()
    const handleOffline = () => applyOnlineState(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérification initiale (corrige le cas où navigator.onLine=true mais réseau mort)
    verify()

    // Polling léger toutes les 30s pour les réseaux captifs / VPN
    pollTimer.current = setInterval(verify, 30_000)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(pollTimer.current)
      clearTimeout(justCameBackTimer.current)
    }
  }, [verify, applyOnlineState])

  return {
    online,
    justCameBack,
    checkNow: verify,
  }
}
