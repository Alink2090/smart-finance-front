/**
 * useSyncEngine.js — Hook React qui pilote la synchronisation
 * Se déclenche automatiquement au retour en ligne.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNetwork } from './useNetwork'
import { runSync } from '../sync/syncEngine'
import { getPendingCount } from '../sync/syncQueue'

export function useSyncEngine() {
  const { online, justCameBack } = useNetwork()
  const [syncing,      setSyncing]      = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastResult,   setLastResult]   = useState(null) // { synced, failed, errors }
  const [progress,     setProgress]     = useState(null) // { done, total }
  const runningRef = useRef(false)

  // Rafraîchit le compteur de pending
  const refreshCount = useCallback(async () => {
    const n = await getPendingCount()
    setPendingCount(n)
  }, [])

  // Lance la synchronisation
  const sync = useCallback(async () => {
    if (runningRef.current || !online) return
    runningRef.current = true
    setSyncing(true)
    setProgress({ done: 0, total: 0 })
    try {
      const result = await runSync(({ done, total }) => setProgress({ done, total }))
      setLastResult(result)
      await refreshCount()
    } finally {
      setSyncing(false)
      setProgress(null)
      runningRef.current = false
    }
  }, [online, refreshCount])

  // Auto-sync au retour en ligne
  useEffect(() => {
    if (justCameBack && online) sync()
  }, [justCameBack, online, sync])

  // Compte initial au montage
  useEffect(() => { refreshCount() }, [refreshCount])

  return { syncing, pendingCount, lastResult, progress, sync, refreshCount }
}
