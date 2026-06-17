/**
 * OfflineBanner.jsx — Bandeau "hors ligne" + indicateur de sync
 * Affiché en haut de toutes les pages (mobile + desktop).
 */
import { useOffline } from '../../context/OfflineContext'

export default function OfflineBanner() {
  const { online, justCameBack, syncing, pendingCount, lastResult, sync } = useOffline()

  // En ligne, rien à afficher (sauf juste après retour)
  if (online && !justCameBack) return null

  // ── Bannière "retour en ligne + sync" ─────────────────────────────────────
  if (online && justCameBack) {
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 90,
        background: syncing
          ? 'linear-gradient(135deg, rgba(56,189,248,.12), rgba(124,108,252,.08))'
          : lastResult?.failed > 0
            ? 'rgba(245,158,11,.1)'
            : 'rgba(34,211,160,.1)',
        borderBottom: `1px solid ${syncing ? 'rgba(56,189,248,.2)' : lastResult?.failed > 0 ? 'rgba(245,158,11,.2)' : 'rgba(34,211,160,.2)'}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13, fontWeight: 600,
        animation: 'fadeIn .3s ease',
      }}>
        {syncing ? (
          <>
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#38bdf8', flexShrink: 0 }} />
            <span style={{ color: '#38bdf8' }}>
              Synchronisation en cours…
              {pendingCount > 0 && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 4 }}>{pendingCount} opération{pendingCount > 1 ? 's' : ''}</span>}
            </span>
          </>
        ) : lastResult?.failed > 0 ? (
          <>
            <span style={{ fontSize: 15 }}>⚠️</span>
            <span style={{ color: '#f59e0b', flex: 1 }}>
              {lastResult.synced} synchronisé{lastResult.synced > 1 ? 's' : ''}, {lastResult.failed} échec{lastResult.failed > 1 ? 's' : ''}
            </span>
            <button onClick={sync} style={{
              padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,.3)',
              background: 'rgba(245,158,11,.1)', color: '#f59e0b',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Réessayer</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 15 }}>✅</span>
            <span style={{ color: '#22d3a0' }}>
              {lastResult?.synced > 0
                ? `${lastResult.synced} modification${lastResult.synced > 1 ? 's' : ''} synchronisée${lastResult.synced > 1 ? 's' : ''}`
                : 'Connexion rétablie'}
            </span>
          </>
        )}
      </div>
    )
  }

  // ── Bannière "hors ligne" ─────────────────────────────────────────────────
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 90,
      background: 'rgba(245,71,106,.08)',
      borderBottom: '1px solid rgba(245,71,106,.15)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, fontWeight: 600,
    }}>
      <svg width="14" height="14" fill="none" stroke="#f5476a" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 015.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0122.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 014.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 016.95 0"/>
        <circle cx="12" cy="20" r="1" fill="#f5476a"/>
      </svg>
      <span style={{ color: '#f5476a', flex: 1 }}>Mode hors ligne</span>
      {pendingCount > 0 && (
        <span style={{
          padding: '2px 8px', borderRadius: 100,
          background: 'rgba(245,71,106,.15)', color: '#f5476a',
          fontSize: 11, fontWeight: 700,
        }}>
          {pendingCount} en attente
        </span>
      )}
    </div>
  )
}
