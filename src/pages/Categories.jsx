import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { createPortal } from 'react-dom'
import { offlineCategoriesAPI } from '../services/offlineApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

// Téléporte le modal dans document.body pour échapper à tout contexte CSS parent
// (sidebar avec transform/filter/will-change qui casse le position:fixed)
function Portal({ children }) {
  return createPortal(children, document.body)
}

const PRESET_COLORS = [
  '#7c6cfc','#f5476a','#22d3a0','#f59e0b','#38bdf8',
  '#a78bfa','#fb923c','#4ade80','#f472b6','#34d399'
]
const PRESET_ICONS = [
  '🍔','🚗','🛍️','🎬','💊','📚','⚡','💼','🏠','✈️','🎮','👕','💰','🏋️','🐾'
]

// Overlay centré — couvre tout l'écran y compris les sidebars éventuelles
const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,                        // top/right/bottom/left : 0
  width: '100%',
  height: '100%',
  background: 'rgba(0,0,0,0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  padding: '16px',                 // garde une marge sur mobile
  boxSizing: 'border-box',
}

// ─────────────────────────────────────────────
// Formulaire création / édition de catégorie
// ─────────────────────────────────────────────
function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial ?? { name: '', color: PRESET_COLORS[0], icon: '💼', type: 'expense' }
  )
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Le nom est requis'); return }
    setErr('')
    setLoading(true)
    try {
      await onSave(form)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Portal>
    <div
      className="overlay fade-in"
      style={OVERLAY_STYLE}
      onClick={onCancel}
    >
      <div
        className="modal-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
          borderRadius: 24,
          padding: 32,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 80px rgba(0,0,0,.6)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {initial?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h3>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px' }}
            onClick={onCancel}
          >✕</button>
        </div>

        {/* Erreur */}
        {err && (
          <div className="error-box" style={{ marginBottom: 14 }}>{err}</div>
        )}

        {/* Nom */}
        <div style={{ marginBottom: 16 }}>
          <label className="input-label">Nom *</label>
          <input
            className="input"
            placeholder="ex : Alimentation"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            autoFocus
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label className="input-label">Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['expense', 'income', 'both'].map(t => (
              <button
                key={t}
                onClick={() => set('type', t)}
                className={`btn btn-sm ${form.type === t ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, textTransform: 'capitalize' }}
              >{t}</button>
            ))}
          </div>
        </div>
        {/* Couleur */}
        <div style={{ marginBottom: 16 }}>
          <label className="input-label">Couleur</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => set('color', c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c, border: 'none', cursor: 'pointer',
                  outline: form.color === c ? '3px solid white' : '3px solid transparent',
                  outlineOffset: 2, transition: 'outline .15s', flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text3)' }}>Personnalisé :</label>
            <input
              type="color"
              value={form.color}
              onChange={e => set('color', e.target.value)}
              style={{
                width: 36, height: 28, borderRadius: 6,
                border: '1px solid var(--border)', cursor: 'pointer',
                background: 'transparent', padding: 2,
              }}
            />
            <input
              className="input"
              value={form.color}
              onChange={e => set('color', e.target.value)}
              style={{ width: 100, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}
            />
          </div>
        </div>

        {/* Icône */}
        <div style={{ marginBottom: 24 }}>
          <label className="input-label">Icône</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {PRESET_ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => set('icon', ic)}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: `1px solid ${form.icon === ic ? 'var(--accent2)' : 'var(--border)'}`,
                  background: form.icon === ic ? 'rgba(124,108,252,.15)' : 'var(--surface2)',
                  cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}
              >{ic}</button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Ou saisir un emoji…"
            value={form.icon}
            onChange={e => set('icon', e.target.value)}
            style={{ maxWidth: 180 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" /> Enregistrement…</>
              : initial?.id ? 'Mettre à jour' : 'Créer la catégorie'
            }
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}

// ─────────────────────────────────────────────
// Modale de confirmation de suppression
// ─────────────────────────────────────────────
function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <Portal>
    <div
      className="overlay fade-in"
      style={OVERLAY_STYLE}
      onClick={onCancel}
    >
      <div
        className="modal-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
          borderRadius: 24,
          padding: 32,
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 20px 80px rgba(0,0,0,.6)',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 42, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          Supprimer « {name} » ?
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24 }}>
          La suppression de cette catégorie peut affecter les transactions existantes.
          Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
// ─────────────────────────────────────────────
export default function Categories() {
  const { user } = useAuth()
  const { success, error: toastErr } = useToast()

  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [err, setErr]               = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [confirmId, setConfirmId]   = useState(null)

  // ── Chargement ─────────────────────────────
  // user?.id dans les deps → load recréé UNIQUEMENT si l'utilisateur change,
  // ce qui évite le double appel causé par [] vide + dépendance manquante.
  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setErr(null)
    try {
      const res = await offlineCategoriesAPI.getAll(user.id)
      setCategories(Array.isArray(res) ? res : (res?.data ?? res?.categories ?? []))
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // ← dépendance correcte (évite le double appel)

  useEffect(() => { load() }, [load])

  // ── Création ───────────────────────────────
  const handleSave = async (data) => {
    try {
      await offlineCategoriesAPI.create({ ...data, user_id: user.id })
      success('Catégorie créée')
      setShowForm(false)
      load()
    } catch (e) {
      toastErr(e.message)
    }
  }

  // ── Suppression ────────────────────────────
  const handleDelete = async () => {
    try {
      await offlineCategoriesAPI.delete(confirmId)
      success('Catégorie supprimée')
      setConfirmId(null)
      load()
    } catch (e) {
      toastErr(e.message)
    }
  }

  const confirmName = categories.find(c => c.id === confirmId)?.name ?? ''

  // ── Rendu ──────────────────────────────────
  const isMobile = useIsMobile()
  return (
    <div className="fade-up" style={{ padding: isMobile ? 16 : 24 }}>

      {/* En-tête de page */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div className="page-header" style={{ margin: 0 }}>
          <div className="page-title">Catégories</div>
          <div className="page-subtitle">{categories.length} catégorie{categories.length !== 1 ? 's' : ''}</div>
        </div>

        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle catégorie
        </button>
      </div>

      {/* Erreur globale */}
      {err && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          {err}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 8 }}
            onClick={load}
          >Réessayer</button>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        /* Squelettes */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>

      ) : categories.length === 0 ? (
        /* État vide */
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Aucune catégorie
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            Les catégories vous aident à organiser vos transactions.
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Ajouter une catégorie
          </button>
        </div>

      ) : (
        /* Grille de catégories */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {categories.map((c, i) => (
            <div
              key={c.id ?? i}
              className="card slide-right"
              style={{
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animationDelay: `${i * 0.04}s`,
                position: 'relative',
                borderLeft: `3px solid ${c.color ?? '#7c6cfc'}`,
              }}
            >
              {/* Icône */}
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: (c.color ?? '#7c6cfc') + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {c.icon ?? c.name?.[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{c.name}</div>
                {c.type && (
                  <span className="badge badge-neutral" style={{ marginTop: 3, fontSize: 11 }}>
                    {c.type}
                  </span>
                )}
              </div>

              {/* Supprimer */}
              <button
                className="btn btn-danger btn-sm"
                style={{
                  padding: '5px 8px', flexShrink: 0,
                  border: 'none', background: 'transparent',
                  opacity: 0.5, transition: 'opacity .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                onClick={() => setConfirmId(c.id)}
              >
                <svg width="13" height="13" fill="none" stroke="var(--red)" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Modales */}
      {showForm && (
        <CategoryForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
      {confirmId && (
        <ConfirmModal
          name={confirmName}
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}