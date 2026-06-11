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
  const syncState = useSyncEngine()

  useEffect(() => { openDB().catch(console.error) }, [])

  return (
    <OfflineContext.Provider value={{ ...network, ...syncState, user }}>
      {children}
    </OfflineContext.Provider>
  )
}
