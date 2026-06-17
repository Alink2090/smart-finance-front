/**
 * useServiceWorker.js
 *
 * Hook qui gère tout le cycle de vie du Service Worker :
 *  1. Enregistrement via vite-plugin-pwa (virtual:pwa-register/react)
 *  2. Détection d'une mise à jour disponible (SW en état "waiting")
 *  3. Exposition d'une fonction `applyUpdate` qui :
 *       a. envoie SKIP_WAITING au SW en attente
 *       b. attend que le nouveau SW soit actif (controllerchange)
 *       c. recharge la page
 *
 * Ce hook est conçu pour être utilisé une seule fois, dans App.jsx.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

// vite-plugin-pwa génère ce module virtuel à la compilation.
// En dev (devOptions.enabled: false) il expose des stubs no-op.
import { useRegisterSW } from 'virtual:pwa-register/react'

export function useServiceWorker() {
  // needRefresh = true quand un SW "waiting" est détecté
  // offlineReady = true quand le précache initial est terminé (mode offline disponible)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      // Vérification périodique toutes les 60 secondes en prod
      // Utile quand l'app reste ouverte longtemps sans navigation
      const interval = setInterval(async () => {
        if (!(!registration.installing && navigator.onLine)) return
        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          })
          if (resp?.status === 200) await registration.update()
        } catch {
          // Offline ou erreur réseau → on ignore silencieusement
        }
      }, 60 * 1000)

      // Nettoyage si le composant se démonte (rare mais propre)
      return () => clearInterval(interval)
    },

    onRegisterError(error) {
      console.warn('[SW] Registration error:', error)
    },

    // Appelé quand le précache est prêt → app utilisable offline
    onOfflineReady() {
      console.info('[SW] App prête pour une utilisation hors ligne ✓')
    },
  })

  /**
   * applyUpdate — déclenché par le bouton "Mettre à jour"
   *
   * updateServiceWorker(true) fait :
   *   1. postMessage({ type: 'SKIP_WAITING' }) au SW waiting
   *   2. window.location.reload() une fois le SW activé
   */
  const applyUpdate = useCallback(() => {
    updateServiceWorker(true)
  }, [updateServiceWorker])

  /**
   * dismissUpdate — l'utilisateur ferme la bannière SANS mettre à jour.
   * On cache la bannière mais on ne bloque pas l'app (contrainte UX assouplie).
   * Le SW restera en "waiting" jusqu'au prochain reload naturel.
   */
  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false)
  }, [setNeedRefresh])

  return {
    /** true quand une nouvelle version est disponible (SW en waiting) */
    needRefresh,
    /** true quand l'app est prête pour une utilisation offline */
    offlineReady,
    /** Applique la mise à jour et recharge */
    applyUpdate,
    /** Cache la bannière (sans mettre à jour) */
    dismissUpdate,
  }
}
