/**
 * OfflineContext.jsx — Contexte global offline
 *
 * Corrections v2 :
 *  - OfflineProvider est séparé de useNetwork pour éviter
 *    les re-renders en cascade au montage
 *  - online est exposé via useCallback stable
 *  - useSyncEngine reçoit online depuis le contexte, pas navigator.onLine
 */
import { createContext, useContext, useEffect, useCallback } from 'react'
import { useNetwork }    from '../hooks/useNetwork'
import { useSyncEngine } from '../hooks/useSyncEngine'
import { useAuth }       from './AuthContext'
import { openDB }           from '../indexeddb/db'
import { setNetworkStatus } from '../services/offlineApi'

const OfflineContext = createContext(null)
export const useOffline = () => useContext(OfflineContext)

export function OfflineProvider({ children }) {
  const { user }  = useAuth()
  const network   = useNetwork()           // { online, justCameBack, checkNow }
  const syncState = useSyncEngine(network) // passe online depuis le hook, pas navigator.onLine

  // Sync network status to offlineApi module (qui ne peut pas lire le hook)
  useEffect(() => {
    setNetworkStatus(network.online)
  }, [network.online])

  // Initialise la base IDB au premier montage
  useEffect(() => { openDB().catch(console.error) }, [])

  const value = {
    // Réseau
    online:       network.online,
    justCameBack: network.justCameBack,
    checkNow:     network.checkNow,
    // Sync
    syncing:      syncState.syncing,
    pendingCount: syncState.pendingCount,
    lastResult:   syncState.lastResult,
    progress:     syncState.progress,
    sync:         syncState.sync,
    refreshCount: syncState.refreshCount,
    // User
    user,
  }

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  )
}
