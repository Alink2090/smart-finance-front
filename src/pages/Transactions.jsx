import { useState, useEffect, useCallback } from 'react'
import { transactionsAPI, categoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import TransactionFilters, { applyFilters, DEFAULT_FILTERS } from '../components/TransactionFilters'

const formatXOF = (n, digits = 0) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(n) || 0) + ' FCFA'

const fmt = n => formatXOF(n, 0)

const OVERLAY_FIX = {
  position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
  background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center',
  zIndex:9999, backdropFilter:'blur(4px)'
}

// ── Modal confirmation suppression ────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="overlay fade-in" style={OVERLAY_FIX} onClick={onCancel}>
      <div className="modal-in" style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, padding:32, width:380, maxWidth:'92vw', boxShadow:'0 20px 80px rgba(0,0,0,.6)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:52, height:52, borderRadius:14, background:'rgba(245,71,106,.12)', border:'1px solid rgba(245,71,106,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, fontSize:22 }}>🗑️</div>
        <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Supprimer la transaction</h3>
        <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6, marginBottom:24 }}>Cette action est irréversible.</p>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Annuler</button>
          <button className="btn btn-danger" style={{ flex:1 }} onClick={onConfirm}>Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ── Formulaire transaction ─────────────────────────────────────────────────────
function TransactionForm({ categories, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    title:'', amount:'', type:'expense', category_id:'', payment_method:'',
    date: new Date().toISOString().split('T')[0], notes:''
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!initial?.id

  const handleSave = async () => {
    if (!form.title || !form.amount || !form.date) { setErr('Titre, montant et date sont requis'); return }
    setErr('')
    setLoading(true)
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) })
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay fade-in" style={OVERLAY_FIX} onClick={onCancel}>
      <div className="modal-in" style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, padding:32, width:480, maxWidth:'92vw', boxShadow:'0 20px 80px rgba(0,0,0,.6)', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{isEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}</h3>
          <button className="btn btn-ghost btn-sm" style={{ padding:'6px' }} onClick={onCancel}>✕</button>
        </div>
        {err && <div className="error-box" style={{ marginBottom:16 }}>{err}</div>}

        <div style={{ marginBottom:16 }}>
          <label className="input-label">Type</label>
          <div style={{ display:'flex', gap:8 }}>
            {['expense','income'].map(t => (
              <button key={t} onClick={()=>set('type',t)} className={`btn ${form.type===t ? (t==='expense'?'btn-danger':'btn-success') : 'btn-ghost'}`} style={{ flex:1 }}>
                {t === 'expense' ? '📉 Dépense' : '📈 Revenu'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <div>
            <label className="input-label">Titre *</label>
            <input className="input" placeholder="ex. Netflix" value={form.title} onChange={e=>set('title',e.target.value)} />
          </div>
          <div>
            <label className="input-label">Montant *</label>
            <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e=>set('amount',e.target.value)} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <div>
            <label className="input-label">Catégorie</label>
            <select className="input" value={form.category_id} onChange={e=>set('category_id',e.target.value)}>
              <option value="">— Aucune —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Moyen de paiement</label>
            <select className="input" value={form.payment_method} onChange={e=>set('payment_method',e.target.value)}>
              <option value="">— Aucun —</option>
              {['Espèces','Carte crédit','Carte débit','Virement','Wallet digital'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="input-label">Date *</label>
          <input className="input" type="date" value={form.date} onChange={e=>set('date',e.target.value)} />
        </div>
        <div style={{ marginBottom:24 }}>
          <label className="input-label">Notes</label>
          <textarea className="input" rows={2} style={{ resize:'none' }} placeholder="Note optionnelle…" value={form.notes} onChange={e=>set('notes',e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" style={{ flex:2 }} onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Enregistrement…</> : (isEdit ? 'Mettre à jour' : 'Ajouter')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Transactions() {
  const { user }  = useAuth()
  const { success, error: toastErr } = useToast()

  const [txs,        setTxs]        = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [err,        setErr]        = useState(null)
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS)
  const [showForm,   setShowForm]   = useState(false)
  const [editTx,     setEditTx]     = useState(null)
  const [confirmId,  setConfirmId]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [txRes, catRes] = await Promise.all([
        transactionsAPI.getAll(user.id),
        categoriesAPI.getAll(),
      ])
      setTxs(Array.isArray(txRes) ? txRes : (txRes?.data ?? txRes?.transactions ?? []))
      setCategories(Array.isArray(catRes) ? catRes : (catRes?.data ?? catRes?.categories ?? []))
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    if (editTx) {
      await transactionsAPI.update(editTx.id, { user_id: user.id, ...data })
      success('Transaction mise à jour')
    } else {
      await transactionsAPI.create({ user_id: user.id, ...data })
      success('Transaction ajoutée')
    }
    setShowForm(false)
    setEditTx(null)
    load()
  }

  const handleDelete = async () => {
    try {
      await transactionsAPI.delete(confirmId, user.id)
      success('Transaction supprimée')
      setConfirmId(null)
      load()
    } catch(e) { toastErr(e.message) }
  }

  // ── Filtrage + tri côté client ─────────────────────────────────────────────
  const filtered = applyFilters(txs, filters)

  const getCatName  = tx => tx.category?.name  ?? categories.find(c=>String(c.id)===String(tx.category_id))?.name  ?? '—'
  const getCatColor = tx => tx.category?.color ?? categories.find(c=>String(c.id)===String(tx.category_id))?.color ?? '#888'

  // ── Totaux des résultats filtrés ───────────────────────────────────────────
  const totalIncome  = filtered.filter(t=>t.type==='income').reduce((s,t)=>s+(t.amount??0),0)
  const totalExpense = filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.amount??0),0)

  return (
    <div className="fade-up" style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div className="page-header" style={{ margin:0 }}>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">{filtered.length} transaction{filtered.length!==1?'s':''}</div>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditTx(null);setShowForm(true)}}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvelle transaction
        </button>
      </div>

      {/* ── Filtres avancés (nouveau composant) ──────────────────────────── */}
      <TransactionFilters
        categories={categories}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        count={filtered.length}
      />

      {/* ── Bande résumé (revenus/dépenses des résultats filtrés) ─────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { label:'Revenus', value:fmt(totalIncome),  color:'var(--green)' },
            { label:'Dépenses',value:fmt(totalExpense), color:'var(--red)'   },
            { label:'Net',     value:fmt(totalIncome - totalExpense), color: (totalIncome-totalExpense) >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, fontSize:13 }}>
              <span style={{ color:'var(--text3)', fontWeight:500 }}>{s.label}</span>
              <span style={{ fontWeight:700, color:s.color, fontFamily:'JetBrains Mono,monospace' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Table (logique originale préservée) ──────────────────────────── */}
      <div className="card" style={{ overflow:'hidden' }}>
        {err && (
          <div className="error-box" style={{ margin:16 }}>
            {err} <button className="btn btn-ghost btn-sm" style={{ marginLeft:8 }} onClick={load}>Réessayer</button>
          </div>
        )}
        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div className="skeleton" style={{ width:36, height:36, borderRadius:10, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div className="skeleton" style={{ width:'50%', height:13, marginBottom:8 }} />
                  <div className="skeleton" style={{ width:'30%', height:11 }} />
                </div>
                <div className="skeleton" style={{ width:80, height:18 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--text3)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text2)' }}>Aucune transaction trouvée</div>
            <div style={{ fontSize:13 }}>Modifiez vos filtres ou ajoutez une nouvelle transaction.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Transaction','Catégorie','Montant','Type','Date','Actions'].map(h => (
                    <th key={h} style={{
                      padding:'12px 16px',
                      textAlign: h==='Montant'||h==='Actions' ? 'right' : 'left',
                      fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'.05em',
                      textTransform:'uppercase', whiteSpace:'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, i) => (
                  <tr key={tx.id} className="table-row slide-right" style={{ animationDelay:`${i*.03}s` }}>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:35, height:35, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, background:(getCatColor(tx))+'22' }}>
                          {getCatName(tx)[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{tx.title}</div>
                          {tx.payment_method && <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{tx.payment_method}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:getCatColor(tx), display:'inline-block', flexShrink:0 }} />
                        <span style={{ fontSize:13, color:'var(--text2)' }}>{getCatName(tx)}</span>
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px', textAlign:'right' }}>
                      <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:tx.type==='income'?'var(--green)':'var(--red)' }}>
                        {tx.type==='income'?'+':'-'}{fmt(tx.amount)}
                      </span>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <span className={`badge badge-${tx.type}`}>{tx.type === 'income' ? 'Revenu' : 'Dépense'}</span>
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace' }}>
                        {tx.date ? new Date(tx.date+'T00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                      </span>
                    </td>
                    <td style={{ padding:'13px 16px', textAlign:'right' }}>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding:'6px 10px' }} onClick={()=>{setEditTx(tx);setShowForm(true)}} title="Modifier">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ padding:'6px 10px' }} onClick={()=>setConfirmId(tx.id)} title="Supprimer">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showForm || editTx) && (
        <TransactionForm
          categories={categories}
          initial={editTx}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
      {confirmId && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
