import { useState, useEffect, useCallback } from 'react'
import { categoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const PRESET_COLORS = ['#7c6cfc','#f5476a','#22d3a0','#f59e0b','#38bdf8','#a78bfa','#fb923c','#4ade80','#f472b6','#34d399']
const PRESET_ICONS = ['🍔','🚗','🛍️','🎬','💊','📚','⚡','💼','🏠','✈️','🎮','👕','💰','🏋️','🐾']

// Correction technique pour le centrage sans toucher au design
const OVERLAY_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(4px)',
  padding: '20px'
}

function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { name:'', color: PRESET_COLORS[0], icon:'💼', type:'expense' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return }
    setErr('')
    setLoading(true)
    try { await onSave(form) }
    catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay fade-in" style={OVERLAY_STYLE} onClick={onCancel}>
      <div className="modal-in" style={{ 
        background:'var(--surface)', 
        border:'1px solid var(--border2)', 
        borderRadius:24, 
        padding:32, 
        width:420, 
        maxWidth:'100%', 
        boxShadow:'0 20px 80px rgba(0,0,0,.6)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{initial?.id ? 'Edit Category' : 'New Category'}</h3>
          <button className="btn btn-ghost btn-sm" style={{ padding:'6px' }} onClick={onCancel}>✕</button>
        </div>
        
        {err && <div className="error-box" style={{ marginBottom:14 }}>{err}</div>}

        <div style={{ marginBottom:16 }}>
          <label className="input-label">Name *</label>
          <input className="input" placeholder="e.g. Food" value={form.name} onChange={e=>set('name',e.target.value)} />
        </div>

        <div style={{ marginBottom:16 }}>
          <label className="input-label">Type</label>
          <div style={{ display:'flex', gap:8 }}>
            {['expense','income','both'].map(t => (
              <button key={t} onClick={()=>set('type',t)} className={`btn btn-sm ${form.type===t?'btn-primary':'btn-ghost'}`} style={{ flex:1, textTransform:'capitalize' }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label className="input-label">Color</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={()=>set('color',c)} style={{
                width:28, height:28, borderRadius:'50%', background:c, border:'none', cursor:'pointer',
                outline: form.color===c ? `3px solid white` : '3px solid transparent',
                outlineOffset:2, transition:'outline .15s', flexShrink:0
              }} />
            ))}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}>
            <label style={{ fontSize:12, color:'var(--text3)' }}>Custom:</label>
            <input type="color" value={form.color} onChange={e=>set('color',e.target.value)} style={{ width:36, height:28, borderRadius:6, border:'1px solid var(--border)', cursor:'pointer', background:'transparent', padding:2 }} />
            <input className="input" value={form.color} onChange={e=>set('color',e.target.value)} style={{ width:100, fontFamily:'JetBrains Mono,monospace', fontSize:12 }} />
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label className="input-label">Icon</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            {PRESET_ICONS.map(ic => (
              <button key={ic} onClick={()=>set('icon',ic)} style={{
                width:34, height:34, borderRadius:8, border:`1px solid ${form.icon===ic?'var(--accent2)':'var(--border)'}`,
                background: form.icon===ic ? 'rgba(124,108,252,.15)' : 'var(--surface2)',
                cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all .15s'
              }}>{ic}</button>
            ))}
          </div>
          <input className="input" placeholder="Or type an emoji…" value={form.icon} onChange={e=>set('icon',e.target.value)} style={{ maxWidth:180 }} />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2 }} onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : (initial?.id ? 'Update' : 'Create Category')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="overlay fade-in" style={OVERLAY_STYLE} onClick={onCancel}>
      <div className="modal-in" style={{ 
        background:'var(--surface)', 
        border:'1px solid var(--border2)', 
        borderRadius:24, 
        padding:32, 
        width:380, 
        maxWidth:'100%', 
        boxShadow:'0 20px 80px rgba(0,0,0,.6)',
        textAlign: 'center'
      }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:42, marginBottom:16 }}>⚠️</div>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Delete "{name}"?</h3>
        <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6, marginBottom:24 }}>
          Deleting this category may affect existing transactions. This action cannot be undone.
        </p>
        <div style={{ display:'flex', gap:12 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" style={{ flex:1 }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function Categories() {
  const { success, error: toastErr } = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await categoriesAPI.getAll()
      setCategories(Array.isArray(res) ? res : (res?.data ?? res?.categories ?? []))
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    try {
      await categoriesAPI.create(data)
      success('Category created')
      setShowForm(false)
      load()
    } catch(e) { toastErr(e.message) }
  }

  const handleDelete = async () => {
    try {
      await categoriesAPI.delete(confirmId)
      success('Category deleted')
      setConfirmId(null)
      load()
    } catch(e) { toastErr(e.message) }
  }

  const confirmName = categories.find(c => c.id === confirmId)?.name ?? ''

  return (
    <div className="fade-up" style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div className="page-header" style={{ margin:0 }}>
          <div className="page-title">Categories</div>
          <div className="page-subtitle">{categories.length} categories</div>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Category
        </button>
      </div>

      {err && <div className="error-box" style={{ marginBottom:16 }}>{err} <button className="btn btn-ghost btn-sm" style={{ marginLeft:8 }} onClick={load}>Retry</button></div>}

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:12 }} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="card" style={{ padding:'60px 20px', textAlign:'center', color:'var(--text3)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏷️</div>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text2)' }}>No categories yet</div>
          <div style={{ fontSize:13, marginBottom:20 }}>Categories help you organize your transactions.</div>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}>Add first category</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          {categories.map((c, i) => (
            <div key={c.id || i} className="card slide-right" style={{
              padding:'16px 18px', display:'flex', alignItems:'center', gap:12,
              animationDelay:`${i*.04}s`, position:'relative',
              borderLeft:`3px solid ${c.color ?? '#7c6cfc'}`
            }}>
              <div style={{ width:38, height:38, borderRadius:10, background:(c.color??'#7c6cfc')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {c.icon ?? c.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                {c.type && <span className="badge badge-neutral" style={{ marginTop:3, fontSize:11 }}>{c.type}</span>}
              </div>
              <button className="btn btn-danger btn-sm" style={{ padding:'5px 8px', flexShrink:0, border:'none', background:'transparent', opacity:.5, transition:'opacity .15s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity=1}
                onMouseLeave={e=>e.currentTarget.style.opacity=.5}
                onClick={()=>setConfirmId(c.id)}>
                <svg width="13" height="13" fill="none" stroke="var(--red)" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <CategoryForm onSave={handleSave} onCancel={()=>setShowForm(false)} />}
      {confirmId && <ConfirmModal name={confirmName} onConfirm={handleDelete} onCancel={()=>setConfirmId(null)} />}
    </div>
  )
}