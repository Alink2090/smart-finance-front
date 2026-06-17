/**
 * MobileBudgets — lightweight mobile budget cards.
 * Imported by Budgets.jsx when isMobile is true.
 */
export default function MobileBudgetCard({ b, onEdit, onDelete }) {
  const isSaving = b.budget_type === 'saving' || b.budget_type === 'saving_global'
  const limit = b.limit_amount ?? b.target_amount ?? 0
  const spent = b.spent_amount ?? b.saved_amount  ?? 0
  const pct   = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0

  const barColor = isSaving
    ? (pct >= 100 ? '#a78bfa' : '#22d3a0')
    : (pct >= 100 ? '#f5476a' : pct >= 80 ? '#f59e0b' : '#7c6cfc')

  const fmt = n => `${new Intl.NumberFormat('fr-FR').format(Number(n)||0)} FCFA`

  return (
    <div className="mobile-budget-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {isSaving ? 'Épargne' : 'Dépense'} · {b.start_date ?? '—'} → {b.end_date ?? '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
          <button onClick={() => onEdit?.(b)} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--surface3)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
          <button onClick={() => onDelete?.(b)} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(245,71,106,.1)', color: 'var(--red)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmt(spent)}</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>sur {fmt(limit)}</span>
      </div>

      <div className="progress" style={{ height: 6 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}
