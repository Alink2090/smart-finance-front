import { useState, useEffect, useCallback } from 'react'
<<<<<<< HEAD
import { createPortal } from 'react-dom'
import { transactionsAPI, categoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const fmt = n =>
  `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`

const PAGE_SIZE = 8

// Téléporte le modal dans document.body — échappe à tout contexte CSS parent
function Portal({ children }) {
  return createPortal(children, document.body)
}

const OVERLAY = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.78)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
}

// ── Filtres ───────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  search: '', type: 'all', income_category: '', expense_category: '',
  dateFrom: '', dateTo: '', amountMin: '', amountMax: '', sort: 'date_desc',
}

function applyFilters(txs, f) {
  let r = [...txs]
  if (f.search) {
    const q = f.search.toLowerCase()
    r = r.filter(t =>
      (t.title ?? '').toLowerCase().includes(q) ||
      (t.notes ?? '').toLowerCase().includes(q)
    )
  }
  if (f.type !== 'all')    r = r.filter(t => t.type === f.type)
  if (f.income_category)   r = r.filter(t => String(t.income_category) === f.income_category || String(t.income_category?.id) === f.income_category)
  if (f.expense_category)  r = r.filter(t => String(t.income_category) === f.expense_category || String(t.expense_category?.id) === f.expense_category)
  if (f.dateFrom)          r = r.filter(t => t.date && t.date >= f.dateFrom)
  if (f.dateTo)            r = r.filter(t => t.date && t.date <= f.dateTo)
  if (f.amountMin !== '')  r = r.filter(t => (t.amount ?? 0) >= parseFloat(f.amountMin))
  if (f.amountMax !== '')  r = r.filter(t => (t.amount ?? 0) <= parseFloat(f.amountMax))
  switch (f.sort) {
    case 'date_asc':    r.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')); break
    case 'date_desc':   r.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')); break
    case 'amount_desc': r.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)); break
    case 'amount_asc':  r.sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0)); break
    default: break
  }
  return r
}

// ── Modal suppression ─────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <Portal>
      <div style={OVERLAY} onClick={onCancel}>
        <div
          className="modal-in"
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 24,
            padding: '36px 32px',
            width: 400,
            maxWidth: '92vw',
            boxShadow: '0 32px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)',
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%',
            height: 2, borderRadius: 1,
            background: 'linear-gradient(90deg,transparent,rgba(245,71,106,.7),transparent)',
          }} />

          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(245,71,106,.1)',
            border: '1px solid rgba(245,71,106,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, fontSize: 26,
          }}>🗑️</div>

          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Supprimer la transaction ?
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 28 }}>
            Cette action est irréversible. La transaction sera définitivement supprimée.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Annuler</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>Supprimer</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

// ── Formulaire transaction ────────────────────────────────────────────────────
function TransactionForm({ incomeCategories, expenseCategories, initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    title:            initial.title ?? '',
    amount:           String(initial.amount ?? ''),
    type:             initial.type ?? 'expense',
    income_category:  String(initial.income_category ?? initial.income_category?.id ?? ''),
    expense_category: String(initial.expense_category ?? initial.expense_category?.id ?? ''),
    payment_method:   initial.payment_method ?? '',
    date:             initial.date ?? new Date().toISOString().split('T')[0],
    notes:            initial.notes ?? '',
  } : {
    title: '', amount: '', type: 'expense',
    income_category: '', expense_category: '',
    payment_method: '', date: new Date().toISOString().split('T')[0], notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit    = !!initial?.id
  const isExpense = form.type === 'expense'

  const handleSave = async () => {
    if (!form.title)  { setErr('Le titre est requis'); return }
    if (!form.amount) { setErr('Le montant est requis'); return }
    if (!form.date)   { setErr('La date est requise'); return }
    if (form.type === 'income' && !form.income_category) {
      setErr('Précisez la source de revenu'); return
    }
    if (form.type === 'expense' && !form.expense_category) {
      setErr('Précisez la catégorie de dépense'); return
    }
    setErr(''); setLoading(true)
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) })
    } catch (e) { setErr(e.message) }
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
    finally { setLoading(false) }
  }

  return (
<<<<<<< HEAD
    <Portal>
      <div style={OVERLAY} onClick={onCancel}>
        <div
          className="modal-in"
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 24,
            padding: '28px 32px 32px',
            width: 540,
            maxWidth: '96vw',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            boxShadow: '0 32px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {/* Ligne lumineuse top */}
          <div style={{
            position: 'absolute', top: 0, left: '15%', right: '15%',
            height: 2, borderRadius: 1,
            background: 'linear-gradient(90deg,transparent,#7c6cfc90,transparent)',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>
                {isEdit ? '✏️ Modifier la transaction' : '➕ Nouvelle transaction'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>
                Renseignez les détails ci-dessous
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px 8px', marginTop: 2 }}
              onClick={onCancel}
            >✕</button>
          </div>

          {/* Type toggle */}
          <div style={{ marginBottom: 20 }}>
            <label className="input-label">Type de transaction</label>
            <div style={{
              display: 'flex', gap: 8, padding: 4,
              background: 'var(--surface2)', borderRadius: 12,
              border: '1px solid var(--border)',
            }}>
              {[
                { v: 'expense', label: '📉 Dépense', color: '#f5476a' },
                { v: 'income',  label: '📈 Revenu',  color: '#22d3a0' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => set('type', opt.v)}
                  style={{
                    flex: 1, padding: '9px 12px',
                    border: 'none', borderRadius: 9, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                    transition: 'all .2s',
                    background: form.type === opt.v
                      ? `linear-gradient(135deg,${opt.color}28,${opt.color}14)`
                      : 'transparent',
                    color: form.type === opt.v ? opt.color : 'var(--text3)',
                    boxShadow: form.type === opt.v
                      ? `inset 0 0 0 1px ${opt.color}40, 0 2px 8px ${opt.color}18`
                      : 'none',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {err && (
            <div className="error-box" style={{ marginBottom: 16, borderRadius: 10 }}>{err}</div>
          )}

          {/* Titre + Montant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label className="input-label">Titre *</label>
              <input
                className="input"
                placeholder="ex. Courses Auchan"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="input-label">Montant (FCFA) *</label>
              <input
                className="input"
                type="number" min="0" step="1"
                placeholder="ex. 15 000"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>
          </div>

          {/* Catégorisation */}
          <div style={{
            marginBottom: 16, padding: '18px 16px',
            background: 'var(--surface2)', borderRadius: 14,
            border: '1px solid var(--border)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16,
            }}>
              Catégorisation
            </div>

            {/* Source de revenu */}
            <div style={{ marginBottom: isExpense ? 14 : 0 }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3a0', display: 'inline-block' }} />
                Source de revenu *
                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 2 }}>
                  {isExpense ? "(d'où est prélevé l'argent ?)" : '(type de revenu)'}
                </span>
              </label>
              <select
                className="input"
                value={form.income_category}
                onChange={e => set('income_category', e.target.value)}
              >
                <option value="">Sélectionner la source…</option>
                {incomeCategories.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.icon ? c.icon + ' ' : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Catégorie dépense */}
            {isExpense && (
              <div>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5476a', display: 'inline-block' }} />
                  Catégorie de dépense *
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 2 }}>
                    (pour quoi est utilisé l'argent ?)
                  </span>
                </label>
                <select
                  className="input"
                  value={form.expense_category}
                  onChange={e => set('expense_category', e.target.value)}
                >
                  <option value="">Sélectionner la catégorie…</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.icon ? c.icon + ' ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Résumé visuel */}
            {isExpense && form.income_category && form.expense_category && (() => {
              const src  = incomeCategories.find(c => String(c.id) === form.income_category)
              const dest = expenseCategories.find(c => String(c.id) === form.expense_category)
              return src && dest ? (
                <div style={{
                  marginTop: 14, padding: '10px 14px',
                  background: 'var(--surface)', borderRadius: 10,
                  border: '1px solid var(--border2)',
                  fontSize: 12, color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: '#22d3a0', fontWeight: 700 }}>{src.icon}{src.name}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 16 }}>→</span>
                  <span style={{ color: '#f5476a', fontWeight: 700 }}>{dest.icon}{dest.name}</span>
                  {form.amount && (
                    <span style={{
                      marginLeft: 'auto',
                      fontFamily: 'JetBrains Mono,monospace',
                      color: 'var(--text)', fontWeight: 700, fontSize: 13,
                    }}>{fmt(form.amount)}</span>
                  )}
                </div>
              ) : null
            })()}
          </div>

          {/* Méthode + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="input-label">Moyen de paiement</label>
              <select
                className="input"
                value={form.payment_method}
                onChange={e => set('payment_method', e.target.value)}
              >
                <option value="">— Aucun —</option>
                {['Espèces', 'Carte crédit', 'Carte débit', 'Virement', 'Mobile Money', 'Wallet digital'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Date *</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 26 }}>
            <label className="input-label">Notes</label>
            <textarea
              className="input"
              rows={2}
              style={{ resize: 'none' }}
              placeholder="Note optionnelle…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

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
                : (isEdit ? '✓ Mettre à jour' : '+ Ajouter')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages = []
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderTop: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>
        Page {page} / {totalPages} · {total} transaction{total !== 1 ? 's' : ''}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => onChange(1)}>«</button>
        <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
        {pages.map(p => (
          <button
            key={p}
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(p)}
            style={{
              minWidth: 32,
              background: page === p ? 'rgba(124,108,252,.2)' : '',
              color:      page === p ? 'var(--accent2)' : '',
              border:     page === p ? '1px solid rgba(124,108,252,.25)' : '',
            }}
          >{p}</button>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
        <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onChange(totalPages)}>»</button>
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Transactions() {
  const { user }  = useAuth()
  const { success, error: toastErr } = useToast()

<<<<<<< HEAD
  const [txs,               setTxs]               = useState([])
  const [incomeCategories,  setIncomeCategories]   = useState([])
  const [expenseCategories, setExpenseCategories]  = useState([])
  const [loading,           setLoading]            = useState(true)
  const [err,               setErr]                = useState(null)
  const [filters,           setFilters]            = useState(DEFAULT_FILTERS)
  const [showForm,          setShowForm]           = useState(false)
  const [editTx,            setEditTx]             = useState(null)
  const [confirmId,         setConfirmId]          = useState(null)
  const [page,              setPage]               = useState(1)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErr(null)
    try {
      const [txRes, catRes] = await Promise.all([
        transactionsAPI.getAll(user.id),
        categoriesAPI.getAll(user.id),
      ])
      setTxs(Array.isArray(txRes) ? txRes : (txRes?.data ?? txRes?.transactions ?? []))
      const cats = Array.isArray(catRes) ? catRes : (catRes?.data ?? catRes?.categories ?? [])
      setIncomeCategories(cats.filter(c => c.type === 'income' || c.type === 'both'))
      setExpenseCategories(cats.filter(c => c.type === 'expense' || c.type === 'both'))
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const handleSave = async data => {
    try {
      if (editTx) {
        await transactionsAPI.update(editTx.id, { user_id: user.id, ...data })
        success('Transaction mise à jour')
      } else {
        await transactionsAPI.create({ user_id: user.id, ...data })
        success('Transaction ajoutée')
      }
      setShowForm(false); setEditTx(null); load()
    } catch (e) { toastErr(e.message) }
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
  }

  const handleDelete = async () => {
    try {
      await transactionsAPI.delete(confirmId, user.id)
      success('Transaction supprimée')
<<<<<<< HEAD
      setConfirmId(null); load()
    } catch (e) { toastErr(e.message) }
  }

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setPage(1) }
  const hasFilter = Object.entries(filters).some(([k, v]) => k === 'sort' ? v !== 'date_desc' : !!v)

  const filtered  = applyFilters(txs, filters)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)

  const getColor = tx => {
    if (tx.type === 'income') return tx.income_category?.color ?? '#22d3a0'
    return tx.expense_category?.color ?? '#f5476a'
  }

  return (
    <div className="fade-up" style={{ padding: 24 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditTx(null); setShowForm(true) }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
          Nouvelle transaction
        </button>
      </div>

<<<<<<< HEAD
      {/* Filtres */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>

          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <svg width="13" height="13" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="input"
              placeholder="Rechercher…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>

          <select className="input" style={{ width: 'auto', flex: '0 0 130px' }}
            value={filters.type} onChange={e => setFilter('type', e.target.value)}>
            <option value="all">Tous types</option>
            <option value="income">Revenus</option>
            <option value="expense">Dépenses</option>
          </select>

          <select className="input" style={{ width: 'auto', flex: '0 0 170px' }}
            value={filters.income_category} onChange={e => setFilter('income_category', e.target.value)}>
            <option value="">Toutes sources</option>
            {incomeCategories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '0 0 170px' }}
            value={filters.expense_category} onChange={e => setFilter('expense_category', e.target.value)}>
            <option value="">Toutes dépenses</option>
            {expenseCategories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '0 0 150px' }}
            value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="amount_desc">Montant ↓</option>
            <option value="amount_asc">Montant ↑</option>
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {hasFilter && (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Réinitialiser</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 260px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Du</span>
            <input className="input" type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Au</span>
            <input className="input" type="date" value={filters.dateTo}   onChange={e => setFilter('dateTo', e.target.value)}   style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Min</span>
            <input className="input" type="number" min="0" placeholder="0"  value={filters.amountMin} onChange={e => setFilter('amountMin', e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Max</span>
            <input className="input" type="number" min="0" placeholder="∞"  value={filters.amountMax} onChange={e => setFilter('amountMax', e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
      </div>

      {/* Résumé */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Revenus',  value: fmt(totalIncome),               color: '#22d3a0' },
            { label: 'Dépenses', value: fmt(totalExpense),              color: '#f5476a' },
            { label: 'Net',      value: fmt(totalIncome - totalExpense), color: (totalIncome - totalExpense) >= 0 ? '#22d3a0' : '#f5476a' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 9, fontSize: 13,
            }}>
              <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono,monospace' }}>{s.value}</span>
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
            </div>
          ))}
        </div>
      )}

<<<<<<< HEAD
      {/* Tableau */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {err && (
          <div className="error-box" style={{ margin: 16 }}>
            {err}{' '}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={load}>Réessayer</button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '50%', height: 13, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '30%', height: 11 }} />
                </div>
                <div className="skeleton" style={{ width: 90, height: 18 }} />
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
<<<<<<< HEAD
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
              Aucune transaction trouvée
            </div>
            <div style={{ fontSize: 13 }}>Modifiez les filtres ou ajoutez une transaction.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Transaction', 'Source revenu', 'Catégorie dépense', 'Montant', 'Type', 'Date', ''].map(h => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'left',
                        fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                        textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx, i) => {
                    const inCat = tx.income_category
                    const exCat = tx.expense_category
                    return (
                      <tr key={tx.id} className="table-row slide-right" style={{ animationDelay: `${i * .03}s` }}>

                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 15,
                              background: getColor(tx) + '22',
                              border: `1px solid ${getColor(tx)}30`,
                            }}>
                              {tx.type === 'income' ? (inCat?.icon ?? '↑') : (exCat?.icon ?? '↓')}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tx.title}</div>
                              {tx.payment_method && (
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{tx.payment_method}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '13px 14px' }}>
                          {inCat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3a0', display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{inCat}</span>
                            </div>
                          ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                        </td>

                        <td style={{ padding: '13px 14px' }}>
                          {tx.type === 'expense' && exCat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: exCat.color ?? '#f5476a', display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{exCat}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '13px 14px' }}>
                          <span style={{
                            fontSize: 14, fontWeight: 700,
                            fontFamily: 'JetBrains Mono,monospace',
                            color: tx.type === 'income' ? '#22d3a0' : '#f5476a',
                          }}>
                            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                          </span>
                        </td>

                        <td style={{ padding: '13px 14px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            padding: '3px 9px', borderRadius: 100,
                            background: tx.type === 'income' ? 'rgba(34,211,160,.12)' : 'rgba(245,71,106,.12)',
                            color: tx.type === 'income' ? '#22d3a0' : '#f5476a',
                          }}>
                            {tx.type === 'income' ? 'Revenu' : 'Dépense'}
                          </span>
                        </td>

                        <td style={{ padding: '13px 14px' }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace' }}>
                            {tx.date
                              ? new Date(tx.date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </td>

                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '5px 8px' }}
                              onClick={() => { setEditTx(tx); setShowForm(true) }}
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '5px 8px' }}
                              onClick={() => setConfirmId(tx.id)}
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={p => { setPage(p); window.scrollTo(0, 0) }}
            />
          </>
=======
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
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
        )}
      </div>

      {(showForm || editTx) && (
        <TransactionForm
<<<<<<< HEAD
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
=======
          categories={categories}
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
          initial={editTx}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
<<<<<<< HEAD
      {confirmId && (
        <ConfirmModal
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
=======
      {confirmId && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
>>>>>>> f88c633e33145195c8ab154dd43130709eeb48c3
