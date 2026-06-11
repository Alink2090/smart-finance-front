/**
 * SyncIndicator.jsx — Badge compact dans la sidebar/header indiquant les items en attente
 */
import { useOffline } from '../../context/OfflineContext'

export default function SyncIndicator({ style }) {
  const { pendingCount, syncing, online } = useOffline()
  if (!pendingCount && !syncing) return null

  return (
    <div title={syncing ? 'Synchronisation…' : `${pendingCount} opération(s) en attente`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 8px', borderRadius: 100,
        background: syncing ? 'rgba(56,189,248,.12)' : 'rgba(245,158,11,.12)',
        border: `1px solid ${syncing ? 'rgba(56,189,248,.2)' : 'rgba(245,158,11,.2)'}`,
        fontSize: 11, fontWeight: 700,
        color: syncing ? '#38bdf8' : '#f59e0b',
        ...style,
      }}>
      {syncing
        ? <><span className="spinner" style={{ width: 9, height: 9, borderWidth: 1.5, borderTopColor: '#38bdf8' }} /> Sync</>
        : <><span style={{ fontSize: 9 }}>⏳</span> {pendingCount}</>
      }
    </div>
  )
}
