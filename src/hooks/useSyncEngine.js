import { useState, useEffect, useCallback, useRef } from 'react'
import { runSync }         from '../sync/syncEngine'
import { getPendingCount } from '../sync/syncQueue'

export function useSyncEngine({ online, justCameBack } = {}) {
  const [syncing,      setSyncing]      = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastResult,   setLastResult]   = useState(null)
  const running = useRef(false)

  const refreshCount = useCallback(async () => {
    try { setPendingCount(await getPendingCount()) } catch {}
  }, [])

  const sync = useCallback(async () => {
    if (running.current || !online) return
    running.current = true
    setSyncing(true)
    try {
      const result = await runSync()
      setLastResult(result)
      await refreshCount()
    } catch (e) {
      setLastResult({ synced: 0, failed: 1, errors: [e.message] })
    } finally {
      setSyncing(false)
      running.current = false
    }
  }, [online, refreshCount])

  // Auto-sync au retour en ligne
  useEffect(() => {
    if (justCameBack && online) sync()
  }, [justCameBack, online, sync])

  useEffect(() => { refreshCount() }, [refreshCount])

  return { syncing, pendingCount, lastResult, sync, refreshCount }
}
