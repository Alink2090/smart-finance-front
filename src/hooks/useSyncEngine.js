/**
 * useSyncEngine.js — Moteur de synchronisation
 *
 * Corrections v2 :
 *  - Reçoit { online, justCameBack } en paramètre depuis OfflineContext
 *    (ne relit PLUS navigator.onLine directement)
 *  - Guard runningRef pour éviter les doubles déclenchements
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { runSync }        from '../sync/syncEngine'
import { getPendingCount } from '../sync/syncQueue'

export function useSyncEngine({ online, justCameBack } = {}) {
  const [syncing,       setSyncing]       = useState(false)
  const [pendingCount,  setPendingCount]  = useState(0)
  const [lastResult,    setLastResult]    = useState(null)
  const [progress,      setProgress]      = useState(null)
  const runningRef = useRef(false)

  const refreshCount = useCallback(async () => {
    const n = await getPendingCount()
    setPendingCount(n)
  }, [])

  const sync = useCallback(async () => {
    if (runningRef.current || !online) return
    runningRef.current = true
    setSyncing(true)
    setProgress({ done: 0, total: 0 })
    try {
      const result = await runSync(({ done, total }) => setProgress({ done, total }))
      setLastResult(result)
      await refreshCount()
    } catch (e) {
      setLastResult({ synced: 0, failed: 1, errors: [e.message] })
    } finally {
      setSyncing(false)
      setProgress(null)
      runningRef.current = false
    }
  }, [online, refreshCount])

  // Auto-sync dès que justCameBack devient true
  useEffect(() => {
    if (justCameBack && online) sync()
  }, [justCameBack, online, sync])

  // Compte au montage
  useEffect(() => { refreshCount() }, [refreshCount])

  return { syncing, pendingCount, lastResult, progress, sync, refreshCount }
}
