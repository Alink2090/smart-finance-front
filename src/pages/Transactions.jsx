import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { transactionsAPI, categoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const fmt = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const PAGE_SIZE = 8

function Portal({ children }) {
  return createPortal(children, document.body)
}

const OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,.78)',
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, boxSizing: 'border-box',
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
    r = r.filter(t => (t.title ?? '').toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q))
  }
  if (f.type !== 'all')   r = r.filter(t => t.type === f.type)
  if (f.income_category)  r = r.filter(t => String(t.income_category) === f.income_category || String(t.income_category?.id) === f.income_category)
  if (f.expense_category) r = r.filter(t => String(t.expense_category) === f.expense_category || String(t.expense_category?.id) === f.expense_category)
  if (f.dateFrom)         r = r.filter(t => t.date && t.date >= f.dateFrom)
  if (f.dateTo)           r = r.filter(t => t.date && t.date <= f.dateTo)
  if (f.amountMin !== '') r = r.filter(t => (t.amount ?? 0) >= parseFloat(f.amountMin))
  if (f.amountMax !== '') r = r.filter(t => (t.amount ?? 0) <= parseFloat(f.amountMax))
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
        <div className="modal-in" onClick={e => e.stopPropagation()} style={{
          background: 'var(--surface)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 24, padding: '36px 32px', width: 400, maxWidth: '92vw',
          boxShadow: '0 32px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)',
          position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, borderRadius: 1, background: 'linear-gradient(90deg,transparent,rgba(245,71,106,.7),transparent)' }} />
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,71,106,.1)', border: '1px solid rgba(245,71,106,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 26 }}>🗑️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Supprimer la transaction ?</h3>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 28 }}>Cette action est irréversible.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Annuler</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>Supprimer</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

// ── Formulaire ────────────────────────────────────────────────────────────────
function TransactionForm({ incomeCategories, expenseCategories, initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    title:            initial.title ?? '',
    amount:           String(initial.amount ?? ''),
    type:             initial.type ?? 'expense',
    income_category:  String(initial.income_category  ?? initial.income_category?.id  ?? ''),
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
  const isEdit     = !!initial?.id
  const isExpense  = form.type === 'expense'
  const isTransfer = form.type === 'transfer'

  // Pour les transferts, seules les catégories 'both' sont affichées
  const availableSrcCats  = isTransfer ? incomeCategories.filter(c  => c.type === 'both') : incomeCategories
  const availableDestCats = isTransfer ? expenseCategories.filter(c => c.type === 'both') : expenseCategories

  const handleSave = async () => {
    if (!form.title)  { setErr('Le titre est requis'); return }
    if (!form.amount) { setErr('Le montant est requis'); return }
    if (!form.date)   { setErr('La date est requise'); return }
    if (!form.income_category)  { setErr('Précisez la source (d\'où vient l\'argent)'); return }
    if ((isExpense || isTransfer) && !form.expense_category) {
      setErr(isTransfer ? 'Précisez la destination du transfert' : 'Précisez la catégorie de dépense')
      return
    }
    setErr(''); setLoading(true)
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) })
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const srcCat  = incomeCategories.find(c => String(c.id) === form.income_category)
  const destCat = expenseCategories.find(c => String(c.id) === form.expense_category)

  // Couleur et config selon le type
  const typeConfig = {
    expense:  { color: '#f5476a', label: '📉 Dépense',   bg: 'linear-gradient(135deg,rgba(245,71,106,.2),rgba(245,71,106,.1))' },
    income:   { color: '#22d3a0', label: '📈 Revenu',    bg: 'linear-gradient(135deg,rgba(34,211,160,.2),rgba(34,211,160,.1))' },
    transfer: { color: '#38bdf8', label: '↔ Transfert',  bg: 'linear-gradient(135deg,rgba(56,189,248,.2),rgba(56,189,248,.1))' },
  }

  return (
    <Portal>
      <div style={OVERLAY} onClick={onCancel}>
        <div className="modal-in" onClick={e => e.stopPropagation()} style={{
          background: 'var(--surface)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 24, padding: '28px 32px 32px',
          width: 540, maxWidth: '96vw', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          boxShadow: '0 32px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)',
          position: 'relative', boxSizing: 'border-box',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, borderRadius: 1, background: 'linear-gradient(90deg,transparent,#7c6cfc90,transparent)' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>
                {isEdit ? '✏️ Modifier' : '➕ Nouvelle transaction'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>Renseignez les détails ci-dessous</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', marginTop: 2 }} onClick={onCancel}>✕</button>
          </div>

          {/* Type toggle — 3 options */}
          <div style={{ marginBottom: 20 }}>
            <label className="input-label">Type de transaction</label>
            <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              {Object.entries(typeConfig).map(([v, cfg]) => (
                <button key={v} onClick={() => set('type', v)} style={{
                  flex: 1, padding: '9px 8px',
                  border: 'none', borderRadius: 9, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all .2s',
                  background: form.type === v ? cfg.bg : 'transparent',
                  color: form.type === v ? cfg.color : 'var(--text3)',
                  boxShadow: form.type === v ? `inset 0 0 0 1px ${cfg.color}40, 0 2px 8px ${cfg.color}18` : 'none',
                }}>{cfg.label}</button>
              ))}
            </div>

            {/* Description contextuelle */}
            {isTransfer && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(56,189,248,.08)', borderRadius: 8, border: '1px solid rgba(56,189,248,.2)', fontSize: 12, color: '#38bdf8' }}>
                ↔ Un transfert déplace de l'argent entre deux catégories sans impacter votre solde global.
              </div>
            )}
          </div>

          {err && <div className="error-box" style={{ marginBottom: 16, borderRadius: 10 }}>{err}</div>}

          {/* Titre + Montant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label className="input-label">Titre *</label>
              <input className="input" placeholder={isTransfer ? 'ex. Virement vers épargne' : 'ex. Courses Auchan'}
                value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="input-label">Montant (FCFA) *</label>
              <input className="input" type="number" min="0" step="1" placeholder="ex. 15 000"
                value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
          </div>

          {/* Catégorisation */}
          <div style={{ marginBottom: 16, padding: '18px 16px', background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
              {isTransfer ? 'Mouvement de fonds' : 'Catégorisation'}
            </div>

            {/* Source */}
            <div style={{ marginBottom: !isExpense && !isTransfer ? 0 : 14 }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3a0', display: 'inline-block' }} />
                {isTransfer ? 'Source (d\'où part l\'argent) *' : 'Source de revenu *'}
                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 2 }}>
                  {isExpense ? "(d'où est prélevé l'argent ?)" : isTransfer ? '' : '(type de revenu)'}
                </span>
              </label>
              <select className="input" value={form.income_category} onChange={e => set('income_category', e.target.value)}>
                <option value="">Sélectionner la source…</option>
                {availableSrcCats.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.icon ? c.icon + ' ' : ''}{c.name}</option>
                ))}
              </select>
            </div>

            {/* Destination — pour dépenses ET transferts */}
            {(isExpense || isTransfer) && (
              <div>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: isTransfer ? '#38bdf8' : '#f5476a', display: 'inline-block' }} />
                  {isTransfer ? 'Destination (où va l\'argent) *' : 'Catégorie de dépense *'}
                  {!isTransfer && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 2 }}>(pour quoi est utilisé l'argent ?)</span>}
                </label>
                <select className="input" value={form.expense_category} onChange={e => set('expense_category', e.target.value)}>
                  <option value="">{isTransfer ? 'Sélectionner la destination…' : 'Sélectionner la catégorie…'}</option>
                  {availableDestCats.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.icon ? c.icon + ' ' : ''}{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Résumé visuel */}
            {(isExpense || isTransfer) && srcCat && destCat && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border2)',
                fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ color: '#22d3a0', fontWeight: 700 }}>{srcCat.icon ?? ''} {srcCat.name}</span>
                <span style={{ color: isTransfer ? '#38bdf8' : 'var(--text3)', fontSize: 18 }}>
                  {isTransfer ? '↔' : '→'}
                </span>
                <span style={{ color: isTransfer ? '#38bdf8' : '#f5476a', fontWeight: 700 }}>{destCat.icon ?? ''} {destCat.name}</span>
                {isTransfer && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(56,189,248,.12)', color: '#38bdf8', fontWeight: 600 }}>
                    Transfert
                  </span>
                )}
                {form.amount && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono,monospace', color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>
                    {fmt(form.amount)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Paiement + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="input-label">{isTransfer ? 'Mode de transfert' : 'Moyen de paiement'}</label>
              <select className="input" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                <option value="">— Aucun —</option>
                {(isTransfer
                  ? ['Virement', 'Mobile Money', 'Wallet digital']
                  : ['Espèces', 'Carte crédit', 'Carte débit', 'Virement', 'Mobile Money', 'Wallet digital']
                ).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 26 }}>
            <label className="input-label">Notes</label>
            <textarea className="input" rows={2} style={{ resize: 'none' }}
              placeholder={isTransfer ? 'Ex. Épargne de précaution mensuelle…' : 'Note optionnelle…'}
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Annuler</button>
            <button className="btn btn-primary" style={{
              flex: 2,
              background: isTransfer ? 'linear-gradient(135deg,#38bdf8,#0284c7)' : undefined,
              boxShadow: isTransfer ? '0 4px 16px rgba(56,189,248,.3)' : undefined,
            }} onClick={handleSave} disabled={loading}>
              {loading ? <><span className="spinner" /> Enregistrement…</> : (isEdit ? '✓ Mettre à jour' : (isTransfer ? '↔ Créer le transfert' : '+ Ajouter'))}
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>Page {page} / {totalPages} · {total} transaction{total !== 1 ? 's' : ''}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-ghost btn-sm" disabled={page === 1}         onClick={() => onChange(1)}>«</button>
        <button className="btn btn-ghost btn-sm" disabled={page === 1}         onClick={() => onChange(page - 1)}>‹</button>
        {pages.map(p => (
          <button key={p} className="btn btn-ghost btn-sm" onClick={() => onChange(p)} style={{
            minWidth: 32,
            background: page === p ? 'rgba(124,108,252,.2)' : '',
            color:      page === p ? 'var(--accent2)' : '',
            border:     page === p ? '1px solid rgba(124,108,252,.25)' : '',
          }}>{p}</button>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
        <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onChange(totalPages)}>»</button>
      </div>
    </div>
  )
}

// ── Badge type ────────────────────────────────────────────────────────────────
const TYPE_BADGE = {
  income:   { label: 'Revenu',    bg: 'rgba(34,211,160,.12)',  color: '#22d3a0' },
  expense:  { label: 'Dépense',   bg: 'rgba(245,71,106,.12)',  color: '#f5476a' },
  transfer: { label: 'Transfert', bg: 'rgba(56,189,248,.12)',  color: '#38bdf8' },
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Transactions() {
  const { user }  = useAuth()
  const { success, error: toastErr } = useToast()

  const [txs,               setTxs]              = useState([])
  const [incomeCategories,  setIncomeCategories]  = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [loading,           setLoading]           = useState(true)
  const [err,               setErr]               = useState(null)
  const [filters,           setFilters]           = useState(DEFAULT_FILTERS)
  const [showForm,          setShowForm]          = useState(false)
  const [editTx,            setEditTx]            = useState(null)
  const [confirmId,         setConfirmId]         = useState(null)
  const [page,              setPage]              = useState(1)

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
      setIncomeCategories(cats.filter(c => c.type === 'income'  || c.type === 'both'))
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
        success(data.type === 'transfer' ? '↔ Transfert enregistré' : 'Transaction ajoutée')
      }
      setShowForm(false); setEditTx(null); load()
    } catch (e) { toastErr(e.message) }
  }

  const handleDelete = async () => {
    try {
      await transactionsAPI.delete(confirmId, user.id)
      success('Transaction supprimée')
      setConfirmId(null); load()
    } catch (e) { toastErr(e.message) }
  }

  const setFilter    = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const resetFilters = ()     => { setFilters(DEFAULT_FILTERS); setPage(1) }
  const hasFilter = Object.entries(filters).some(([k, v]) => k === 'sort' ? v !== 'date_desc' : !!v)

  const filtered  = applyFilters(txs, filters)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Totaux — les transferts sont neutres (non comptabilisés dans le solde)
  const totalIncome   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalExpense  = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalTransfer = filtered.filter(t => t.type === 'transfer').reduce((s, t) => s + (t.amount ?? 0), 0)

  const getAccent = tx => {
    if (tx.type === 'transfer') return '#38bdf8'
    if (tx.type === 'income')   return tx.income_category?.color  ?? '#22d3a0'
    return tx.expense_category?.color ?? '#f5476a'
  }

  return (
    <div className="fade-up" style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTx(null); setShowForm(true) }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle transaction
        </button>
      </div>

      {/* Filtres */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <svg width="13" height="13" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className="input" placeholder="Rechercher…" value={filters.search}
              onChange={e => setFilter('search', e.target.value)} style={{ paddingLeft: 30 }} />
          </div>

          {/* Filtre type incluant transfert */}
          <select className="input" style={{ width: 'auto', flex: '0 0 140px' }}
            value={filters.type} onChange={e => setFilter('type', e.target.value)}>
            <option value="all">Tous types</option>
            <option value="income">Revenus</option>
            <option value="expense">Dépenses</option>
            <option value="transfer">Transferts</option>
          </select>

          <select className="input" style={{ width: 'auto', flex: '0 0 165px' }}
            value={filters.income_category} onChange={e => setFilter('income_category', e.target.value)}>
            <option value="">Toutes sources</option>
            {incomeCategories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '0 0 165px' }}
            value={filters.expense_category} onChange={e => setFilter('expense_category', e.target.value)}>
            <option value="">Toutes destinations</option>
            {expenseCategories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '0 0 150px' }}
            value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="amount_desc">Montant ↓</option>
            <option value="amount_asc">Montant ↑</option>
          </select>

          {hasFilter && <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Réinitialiser</button>}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 260px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Du</span>
            <input className="input" type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Au</span>
            <input className="input" type="date" value={filters.dateTo}   onChange={e => setFilter('dateTo',   e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Min</span>
            <input className="input" type="number" min="0" placeholder="0" value={filters.amountMin} onChange={e => setFilter('amountMin', e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Max</span>
            <input className="input" type="number" min="0" placeholder="∞" value={filters.amountMax} onChange={e => setFilter('amountMax', e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
      </div>

      {/* Résumé — 4 tuiles dont transferts */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Revenus',    value: fmt(totalIncome),               color: '#22d3a0' },
            { label: 'Dépenses',   value: fmt(totalExpense),              color: '#f5476a' },
            { label: 'Net',        value: fmt(totalIncome - totalExpense), color: (totalIncome - totalExpense) >= 0 ? '#22d3a0' : '#f5476a' },
            ...(totalTransfer > 0 ? [{ label: '↔ Transferts', value: fmt(totalTransfer), color: '#38bdf8' }] : []),
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13 }}>
              <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono,monospace' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {err && <div className="error-box" style={{ margin: 16 }}>{err} <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={load}>Réessayer</button></div>}

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
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>Aucune transaction trouvée</div>
            <div style={{ fontSize: 13 }}>Modifiez les filtres ou ajoutez une transaction.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Transaction', 'Source', 'Destination', 'Montant', 'Type', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx, i) => {
                    const inCat  = tx.income_category
                    const exCat  = tx.expense_category
                    const accent = getAccent(tx)
                    const badge  = TYPE_BADGE[tx.type] ?? TYPE_BADGE.expense

                    return (
                      <tr key={tx.id} className="table-row slide-right" style={{ animationDelay: `${i * .03}s` }}>

                        {/* Titre */}
                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: accent + '22', border: `1px solid ${accent}30` }}>
                              {tx.type === 'transfer' ? '↔' : tx.type === 'income' ? (inCat?.icon ?? '↑') : (exCat?.icon ?? '↓')}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tx.title}</div>
                              {tx.payment_method && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{tx.payment_method}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Source */}
                        <td style={{ padding: '13px 14px' }}>
                          {inCat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3a0', display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{typeof inCat === 'object' ? inCat.name : inCat}</span>
                            </div>
                          ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                        </td>

                        {/* Destination */}
                        <td style={{ padding: '13px 14px' }}>
                          {(tx.type === 'expense' || tx.type === 'transfer') && exCat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: tx.type === 'transfer' ? '#38bdf8' : (exCat?.color ?? '#f5476a'), display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{typeof exCat === 'object' ? exCat.name : exCat}</span>
                            </div>
                          ) : <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>—</span>}
                        </td>

                        {/* Montant */}
                        <td style={{ padding: '13px 14px' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: accent }}>
                            {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}{fmt(tx.amount)}
                          </span>
                        </td>

                        {/* Badge type */}
                        <td style={{ padding: '13px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '13px 14px' }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace' }}>
                            {tx.date ? new Date(tx.date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '5px 8px' }} onClick={() => { setEditTx(tx); setShowForm(true) }}>
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(tx.id)}>
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE}
              onChange={p => { setPage(p); window.scrollTo(0, 0) }} />
          </>
        )}
      </div>

      {(showForm || editTx) && (
        <TransactionForm
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          initial={editTx}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
      {confirmId && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}