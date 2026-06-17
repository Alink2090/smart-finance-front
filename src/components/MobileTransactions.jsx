/**
 * MobileTransactions — mobile UI for the Transactions page.
 * Shows filter chips, transaction list as cards, and FAB to add.
 */
import { useState } from 'react'

const fmt = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtShort = n => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

const TYPE_CHIPS = [
  { key: 'all',      label: 'Tout' },
  { key: 'expense',  label: 'Dépenses' },
  { key: 'income',   label: 'Revenus' },
  { key: 'transfer', label: 'Transferts' },
]

function Sk({ h = 60, r = 12 }) {
  return <div className="skeleton" style={{ height: h, borderRadius: r, margin: '0 16px 8px' }} />
}

export default function MobileTransactions({ transactions, loading, onAdd, onEdit, onDelete, totalCount }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = transactions.filter(tx => {
    const matchType = typeFilter === 'all' || tx.type === typeFilter
    const q = search.toLowerCase()
    const matchSearch = !q || (tx.title ?? '').toLowerCase().includes(q)
    return matchType && matchSearch
  })

  const isEmpty = !loading && filtered.length === 0

  return (
    <div className="mobile-page fade-up">

      {/* Search bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="mobile-input"
            placeholder="Rechercher une transaction…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mobile-filter-chips">
        {TYPE_CHIPS.map(chip => (
          <button key={chip.key} className={`mobile-chip${typeFilter === chip.key ? ' active' : ''}`}
            onClick={() => setTypeFilter(chip.key)}>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <div style={{ padding: '0 16px 8px', fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          {typeFilter !== 'all' || search ? ' (filtrées)' : ''}
        </div>
      )}

      {/* List */}
      {loading ? (
        <>
          <Sk /><Sk /><Sk /><Sk /><Sk />
        </>
      ) : isEmpty ? (
        <div className="mobile-empty">
          <div className="mobile-empty-icon">💸</div>
          <div className="mobile-empty-title">Aucune transaction</div>
          <div className="mobile-empty-sub">
            {search || typeFilter !== 'all'
              ? 'Aucun résultat pour ces filtres.'
              : 'Ajoutez votre première transaction en appuyant sur +'}
          </div>
        </div>
      ) : (
        <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {filtered.map((tx, i) => {
            const isIncome   = tx.type === 'income'
            const isTransfer = tx.type === 'transfer'
            const amtColor   = isIncome ? 'var(--green)' : isTransfer ? 'var(--blue)' : 'var(--red)'
            const amtSign    = isIncome ? '+' : isTransfer ? '⇄' : '-'
            const iconBg     = isIncome ? 'rgba(34,211,160,.1)' : isTransfer ? 'rgba(56,189,248,.1)' : 'rgba(245,71,106,.1)'
            const icon       = isIncome ? '💚' : isTransfer ? '🔄' : '🔴'

            return (
              <div key={tx.id ?? i} className="mobile-tx-item"
                style={{ cursor: 'pointer' }}
                onClick={() => onEdit?.(tx)}>
                <div className="mobile-tx-icon" style={{ background: iconBg }}>
                  <span>{icon}</span>
                </div>
                <div className="mobile-tx-body">
                  <div className="mobile-tx-title">{tx.title || 'Transaction'}</div>
                  <div className="mobile-tx-meta">
                    {tx.date ? new Date(tx.date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    {tx.payment_method ? ` · ${tx.payment_method}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div className="mobile-tx-amount" style={{ color: amtColor }}>
                    {amtSign}{fmtShort(tx.amount)}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); onDelete?.(tx) }}
                      style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(245,71,106,.1)', color: 'var(--red)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: 80 }} />

      {/* FAB */}
      <button className="mobile-fab" onClick={onAdd} aria-label="Ajouter une transaction">
        <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  )
}
