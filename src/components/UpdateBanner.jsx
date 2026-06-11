/**
 * UpdateBanner.jsx
 *
 * Bannière/modal de mise à jour affichée quand une nouvelle version du SW est disponible.
 * Rendu conditionnel selon la taille d'écran :
 *   - Desktop : bannière fixe en bas à droite (toast-style)
 *   - Mobile  : bottom sheet avec animation slide-up
 *
 * Props :
 *   onUpdate  — fonction qui déclenche skipWaiting + reload
 *   onDismiss — fonction qui cache la bannière sans mettre à jour
 */
import { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

// Icône "flèche circulaire" SVG inline — pas de dépendance externe
function UpdateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ── Desktop toast (bas droite) ────────────────────────────────────────────────
function DesktopBanner({ onUpdate, onDismiss, updating }) {
  const [visible, setVisible] = useState(false)

  // Animation d'entrée légèrement différée
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      width: 360, maxWidth: 'calc(100vw - 48px)',
      background: 'var(--surface)',
      border: '1px solid rgba(124,108,252,.3)',
      borderRadius: 18,
      boxShadow: '0 8px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(124,108,252,.1) inset',
      padding: '18px 18px 16px',
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(.96)',
      opacity: visible ? 1 : 0,
      transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), opacity .25s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {/* Barre accent top */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
        borderRadius: 1,
        background: 'linear-gradient(90deg, transparent, #7c6cfc, transparent)',
      }} />

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Icône */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,108,252,.2), rgba(91,77,232,.15))',
          border: '1px solid rgba(124,108,252,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#a78bfa',
        }}>
          <UpdateIcon />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            Nouvelle version disponible
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            SmartFinance a été mis à jour. Rechargez pour profiter des dernières améliorations.
          </div>
        </div>

        {/* Fermer */}
        <button onClick={onDismiss} style={{
          width: 28, height: 28, borderRadius: 8, border: 'none', flexShrink: 0,
          background: 'var(--surface2)', color: 'var(--text3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'background .15s, color .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text3)' }}
          aria-label="Fermer"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onDismiss} style={{
          flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
          borderRadius: 10, background: 'transparent', color: 'var(--text2)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' }}
        >
          Plus tard
        </button>
        <button onClick={onUpdate} disabled={updating} style={{
          flex: 2, padding: '9px 16px',
          border: 'none', borderRadius: 10,
          background: 'linear-gradient(135deg, #7c6cfc, #5b4de8)',
          color: 'white', fontSize: 13, fontWeight: 700,
          cursor: updating ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          boxShadow: '0 2px 12px rgba(124,108,252,.35)',
          opacity: updating ? .7 : 1,
          transition: 'all .18s',
        }}
          onMouseEnter={e => { if (!updating) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,108,252,.5)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(124,108,252,.35)' }}
        >
          {updating ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Mise à jour…</>
          ) : (
            <><UpdateIcon /> Mettre à jour</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Mobile bottom sheet ───────────────────────────────────────────────────────
function MobileSheet({ onUpdate, onDismiss, updating }) {
  return (
    <>
      {/* Backdrop semi-transparent */}
      <div onClick={onDismiss} style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,.45)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'var(--surface)',
        borderRadius: '22px 22px 0 0',
        border: '1px solid rgba(124,108,252,.2)',
        borderBottom: 'none',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        animation: 'slideUp .28s cubic-bezier(.34,1.3,.64,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border2)',
          margin: '12px auto 20px',
        }} />

        <div style={{ padding: '0 20px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(124,108,252,.2), rgba(91,77,232,.12))',
              border: '1px solid rgba(124,108,252,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#a78bfa', fontSize: 22,
            }}>
              🚀
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
                Mise à jour disponible
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                SmartFinance a été amélioré
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: 'rgba(124,108,252,.08)',
            border: '1px solid rgba(124,108,252,.15)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              Une nouvelle version est prête. La mise à jour prend moins d'une seconde et préserve toutes vos données.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#22d3a0', fontWeight: 600 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Vos données restent intactes
            </div>
          </div>

          {/* CTA principal */}
          <button onClick={onUpdate} disabled={updating} style={{
            width: '100%', padding: '15px',
            border: 'none', borderRadius: 14,
            background: updating ? 'var(--surface2)' : 'linear-gradient(135deg, #7c6cfc, #5b4de8)',
            color: updating ? 'var(--text2)' : 'white',
            fontSize: 15, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: updating ? 'none' : '0 4px 20px rgba(124,108,252,.4)',
            transition: 'all .2s',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {updating ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Redémarrage…</>
            ) : (
              '🔄  Mettre à jour maintenant'
            )}
          </button>

          {/* Secondaire */}
          <button onClick={onDismiss} style={{
            width: '100%', padding: '13px',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 14, color: 'var(--text3)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Rappeler plus tard
          </button>
        </div>
      </div>
    </>
  )
}

// ── Composant principal exporté ───────────────────────────────────────────────
export default function UpdateBanner({ onUpdate, onDismiss }) {
  const isMobile = useIsMobile()
  const [updating, setUpdating] = useState(false)

  const handleUpdate = async () => {
    setUpdating(true)
    // Laisse le temps à l'UI de montrer le spinner avant que la page reload
    await new Promise(r => setTimeout(r, 300))
    onUpdate()
    // Si après 5s la page n'a pas rechargé (problème SW), on force
    setTimeout(() => window.location.reload(), 5000)
  }

  if (isMobile) {
    return <MobileSheet onUpdate={handleUpdate} onDismiss={onDismiss} updating={updating} />
  }
  return <DesktopBanner onUpdate={handleUpdate} onDismiss={onDismiss} updating={updating} />
}
