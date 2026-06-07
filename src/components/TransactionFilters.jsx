/**
 * TransactionFilters — barre de filtres avancée pour la page Transactions.
 * Extraction propre : on ajoute dateFrom/dateTo/amountMin/amountMax/sort
 * sans toucher à la logique de la liste existante.
 *
 * Props:
 *   categories  : [{ id, name }]
 *   filters     : { search, type, categoryId, dateFrom, dateTo, amountMin, amountMax, sort }
 *   onChange    : (filters) => void
 *   onReset     : () => void
 *   count       : number — nb de résultats affichés
 */
export default function TransactionFilters({ categories, filters, onChange, onReset, count }) {
  const set = (k, v) => onChange({ ...filters, [k]: v })

  const hasActive = filters.search || filters.type !== 'all' || filters.categoryId
    || filters.dateFrom || filters.dateTo || filters.amountMin || filters.amountMax

  return (
    <div className="card" style={{ padding: 14, marginBottom: 16 }}>
      {/* Ligne 1 : search + type + catégorie + reset */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
          <svg width="13" height="13" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="input" placeholder="Rechercher…"
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Type */}
        <select className="input" style={{ width: 'auto', flex: '0 0 130px' }}
          value={filters.type} onChange={e => set('type', e.target.value)}>
          <option value="all">Tous types</option>
          <option value="income">Revenus</option>
          <option value="expense">Dépenses</option>
        </select>

        {/* Catégorie */}
        <select className="input" style={{ width: 'auto', flex: '0 0 150px' }}
          value={filters.categoryId} onChange={e => set('categoryId', e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>

        {/* Tri */}
        <select className="input" style={{ width: 'auto', flex: '0 0 150px' }}
          value={filters.sort} onChange={e => set('sort', e.target.value)}>
          <option value="date_desc">Date ↓</option>
          <option value="date_asc">Date ↑</option>
          <option value="amount_desc">Montant ↓</option>
          <option value="amount_asc">Montant ↑</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            {count} résultat{count !== 1 ? 's' : ''}
          </span>
          {hasActive && (
            <button className="btn btn-ghost btn-sm" onClick={onReset}>Réinitialiser</button>
          )}
        </div>
      </div>

      {/* Ligne 2 : date + montant */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 240px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
            Du
          </span>
          <input className="input" type="date" style={{ flex: 1 }}
            value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Au
          </span>
          <input className="input" type="date" style={{ flex: 1 }}
            value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
            Min $
          </span>
          <input className="input" type="number" min="0" step="1" placeholder="0"
            style={{ flex: 1 }} value={filters.amountMin}
            onChange={e => set('amountMin', e.target.value)} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
            Max $
          </span>
          <input className="input" type="number" min="0" step="1" placeholder="∞"
            style={{ flex: 1 }} value={filters.amountMax}
            onChange={e => set('amountMax', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

/**
 * applyFilters — fonction pure à utiliser dans Transactions.jsx
 * pour filtrer + trier le tableau de transactions.
 */
export function applyFilters(txs, filters) {
  let result = [...txs]

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q) ||
      t.payment_method?.toLowerCase().includes(q)
    )
  }

  if (filters.type !== 'all') {
    result = result.filter(t => t.type === filters.type)
  }

  if (filters.categoryId) {
    result = result.filter(t =>
      String(t.category_id) === filters.categoryId ||
      String(t.category?.id) === filters.categoryId
    )
  }

  if (filters.dateFrom) {
    result = result.filter(t => t.date && t.date >= filters.dateFrom)
  }

  if (filters.dateTo) {
    result = result.filter(t => t.date && t.date <= filters.dateTo)
  }

  if (filters.amountMin !== '') {
    result = result.filter(t => (t.amount ?? 0) >= parseFloat(filters.amountMin))
  }

  if (filters.amountMax !== '') {
    result = result.filter(t => (t.amount ?? 0) <= parseFloat(filters.amountMax))
  }

  switch (filters.sort) {
    case 'date_asc':    result.sort((a,b) => (a.date ?? '').localeCompare(b.date ?? '')); break
    case 'date_desc':   result.sort((a,b) => (b.date ?? '').localeCompare(a.date ?? '')); break
    case 'amount_asc':  result.sort((a,b) => (a.amount ?? 0) - (b.amount ?? 0)); break
    case 'amount_desc': result.sort((a,b) => (b.amount ?? 0) - (a.amount ?? 0)); break
    default: break
  }

  return result
}

export const DEFAULT_FILTERS = {
  search: '', type: 'all', categoryId: '',
  dateFrom: '', dateTo: '',
  amountMin: '', amountMax: '',
  sort: 'date_desc',
}
