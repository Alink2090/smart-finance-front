import { createContext, useContext, useEffect } from 'react'
import { useNetwork }    from '../hooks/useNetwork'
import { useSyncEngine } from '../hooks/useSyncEngine'
import { useAuth }       from './AuthContext'
import { openDB }        from '../indexeddb/db'

const OfflineContext = createContext(null)
export const useOffline = () => useContext(OfflineContext)

export function OfflineProvider({ children }) {
  const { user }  = useAuth()
  const network   = useNetwork()
  const syncState = useSyncEngine(network)

  useEffect(() => { openDB().catch(console.error) }, [])

  return (
    <OfflineContext.Provider value={{
      online:       network.online,
      justCameBack: network.justCameBack,
      syncing:      syncState.syncing,
      pendingCount: syncState.pendingCount,
      lastResult:   syncState.lastResult,
      progress:     syncState.progress,
      sync:         syncState.sync,
      refreshCount: syncState.refreshCount,
      user,
    }}>
      {children}
    </OfflineContext.Provider>
  )
}
