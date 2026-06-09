
/**
 * Reports.jsx — VERSION ALLÉGÉE
 * Aucun calcul côté front — tout vient du back.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI, transactionsAPI } from '../services/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const fmt     = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtFull = n => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(Number(n) || 0)} FCFA`
const fmtPct  = n => `${(n ?? 0).toFixed(1)}%`
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function Sk({ h = 16, r = 6, w = '100%' }) {
  return <div className="skeleton" style={{ height: h, borderRadius: r, width: w, marginBottom: 8 }} />
}

function exportCSV(transactions, filename = 'transactions.csv') {
  const headers = ['Date', 'Titre', 'Catégorie', 'Type', 'Montant (FCFA)', 'Moyen de paiement', 'Notes']
  const rows = transactions.map(t => [
    t.date ?? '',
    `"${(t.title ?? '').replace(/"/g, '""')}"`,
    `"${(t.category?.name ?? '').replace(/"/g, '""')}"`,
    t.type ?? '',
    (t.amount ?? 0).toString()+ "Fcfa",
    `"${(t.payment_method ?? '').replace(/"/g, '""')}"`,
    `"${(t.notes ?? '').replace(/"/g, '""')}"`,
  ])
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { user } = useAuth()

  // Données back
  const [dashboard,   setDashboard]   = useState(null)
  const [monthly,     setMonthly]     = useState([])
  const [monthlyMeta, setMonthlyMeta] = useState(null)
  const [catData,     setCatData]     = useState([])
  const [topCat,      setTopCat]      = useState(null)
  const [txs,         setTxs]         = useState([])
  const [loading,     setLoading]     = useState(true)
  const [err,         setErr]         = useState(null)

  // Filtres UI uniquement
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortCol,    setSortCol]    = useState('date')
  const [sortDir,    setSortDir]    = useState('desc')
  const [page,       setPage]       = useState(1)

  const PAGE_SIZE = 8
  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErr(null)
    try {
      const [dash, mon, cat, t] = await Promise.all([
        analyticsAPI.dashboard(user.id),
        analyticsAPI.monthlyExpenses(user.id, 12),
        analyticsAPI.categoryExpenses(user.id),
        transactionsAPI.getAll(user.id),
      ])
      setDashboard(dash?.data ?? dash)
      setMonthly(mon?.data ?? [])
      setMonthlyMeta(mon?.metrics ?? null)
      setCatData(cat?.data ?? [])
      setTopCat(cat?.top_category ?? null)
      setTxs(Array.isArray(t) ? t : (t?.data ?? t?.transactions ?? []))
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  // Filtrage + tri uniquement côté front (pas de calcul métier)
  const filtered = useMemo(() => {
    let res = [...txs]
    if (dateFrom)         res = res.filter(t => t.date && t.date >= dateFrom)
    if (dateTo)           res = res.filter(t => t.date && t.date <= dateTo)
    if (typeFilter !== 'all') res = res.filter(t => t.type === typeFilter)
    res.sort((a, b) => {
      let va, vb
      if (sortCol === 'date')   { va = a.date ?? '';    vb = b.date ?? '' }
      else if (sortCol === 'amount') { va = a.amount ?? 0; vb = b.amount ?? 0 }
      else if (sortCol === 'title')  { va = a.title ?? '';  vb = b.title ?? '' }
      else { return 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return res
  }, [txs, dateFrom, dateTo, typeFilter, sortCol, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  const reportIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const reportExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)

  const pieData = catData.map((c, i) => ({
    name:  c.category?.name ?? `Cat ${i + 1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? `hsl(${i * 47},65%,55%)`,
  }))
  const totalCat = pieData.reduce((s, d) => s + d.value, 0)

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const SortIcon = ({ col }) => sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ opacity: .3 }}>↕</span>

  // Helper : extrait le nom d'une catégorie qu'elle soit objet ou string
  const catName = cat => cat ? (typeof cat === 'object' ? cat.name : cat) : null

  return (
    <div className="fade-up" style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Rapports</div>
          <div className="page-subtitle">Synthèse financière · Généré le {today}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => exportCSV(filtered)} disabled={loading || filtered.length === 0}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            Imprimer / PDF
          </button>
        </div>
      </div>

      {err && <div className="error-box" style={{ marginBottom: 20 }}>{err} <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={load}>Réessayer</button></div>}

      {/* KPIs — tous servis par Django */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Revenus totaux',      value: fmt(dashboard?.total_income),             color: '#22d3a0' },
          { label: 'Dépenses totales',    value: fmt(dashboard?.total_expenses),           color: '#f5476a' },
          { label: 'Solde net',           value: fmt(dashboard?.balance),                  color: (dashboard?.balance ?? 0) >= 0 ? '#22d3a0' : '#f5476a' },
          { label: "Taux d'épargne",      value: fmtPct(dashboard?.savings_rate),          color: '#7c6cfc' },
          { label: 'Moy. mensuelle dép.', value: fmt(monthlyMeta?.avg_monthly_expense),   color: '#f59e0b' },
          { label: 'Top catégorie',       value: topCat?.name ?? '—',                      color: topCat?.color ?? 'var(--text)', sub: topCat ? `${(topCat.share_pct ?? 0).toFixed(0)}% des dépenses` : '' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ flex: '1 1 130px', padding: '16px 18px', borderLeft: `2px solid ${s.color}` }}>
            {loading ? <><Sk w="60%" h={12} /><Sk w="80%" h={22} /></> : (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.1 }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.sub}</div>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Breakdown catégories + pie */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '2 1 300px', padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Répartition par catégorie</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>Dépenses totales {fmt(totalCat)}</div>
          </div>
          {loading ? [1, 2, 3, 4].map(i => <Sk key={i} h={18} />) :
            pieData.map((d, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(d.value)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 34, textAlign: 'right' }}>
                      {totalCat > 0 ? `${((d.value / totalCat) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="progress" style={{ height: 5 }}>
                  <div className="progress-fill" style={{ width: totalCat > 0 ? `${(d.value / totalCat) * 100}%` : '0%', height: '100%', background: d.color }} />
                </div>
              </div>
            ))
          }
        </div>

        <div className="card" style={{ flex: '1 1 220px', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Répartition visuelle</div>
          </div>
          {loading ? <Sk h={180} /> : pieData.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Pas de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v), 'Montant']} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {!loading && pieData.slice(0, 4).map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' }}>
                {totalCat > 0 ? fmtPct((d.value / totalCat) * 100) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Résumé mensuel — données du back */}
      {!loading && monthly.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Résumé mensuel</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Mois', 'Revenus', 'Dépenses', 'Solde', 'Épargne'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const sol     = (m.income ?? 0) - (m.expenses ?? 0)
                  const saving  = (m.income ?? 0) > 0 ? (sol / m.income) * 100 : 0
                  return (
                    <tr key={i} className="table-row">
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{m.month}</td>
                      <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono,monospace', color: '#22d3a0', fontSize: 13 }}>{fmt(m.income ?? 0)}</td>
                      <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono,monospace', color: '#f5476a', fontSize: 13 }}>{fmt(m.expenses ?? 0)}</td>
                      <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono,monospace', color: sol >= 0 ? '#22d3a0' : '#f5476a', fontWeight: 700, fontSize: 13 }}>{fmt(sol)}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13 }}>
                        <span style={{ color: saving >= 20 ? '#22d3a0' : saving >= 10 ? '#f59e0b' : '#f5476a', fontWeight: 600 }}>
                          {fmtPct(saving)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtres transactions */}
      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 240px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>Du</span>
          <input className="input" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} style={{ flex: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Au</span>
          <input className="input" type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value); setPage(1) }}   style={{ flex: 1 }} />
        </div>
        <select className="input" style={{ width: 'auto', flex: '0 0 140px' }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="all">Tous types</option>
          <option value="income">Revenus</option>
          <option value="expense">Dépenses</option>
          <option value="transfer">Transfert</option>
        </select>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          {(dateFrom || dateTo || typeFilter !== 'all') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setPage(1) }}>Réinitialiser</button>
          )}
          {filtered.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '5px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              Revenus : <strong style={{ color: '#22d3a0' }}>{fmt(reportIncome)}</strong>
              {' · '}Dépenses : <strong style={{ color: '#f5476a' }}>{fmt(reportExpense)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Table transactions */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}>{[1, 2, 3, 4, 5].map(i => <Sk key={i} h={42} r={8} />)}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Aucune transaction</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    { label: 'Date',        col: 'date'   },
                    { label: 'Titre',       col: 'title'  },
                    { label: 'Source',      col: null     },
                    { label: 'Destination', col: null     },
                    { label: 'Type',        col: null     },
                    { label: 'Montant',     col: 'amount' },
                    { label: 'Méthode',     col: null     },
                  ].map(h => (
                    <th key={h.label} onClick={h.col ? () => toggleSort(h.col) : undefined} style={{
                      padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                      color: h.col && sortCol === h.col ? 'var(--accent2)' : 'var(--text3)',
                      textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap',
                      cursor: h.col ? 'pointer' : 'default', userSelect: 'none',
                    }}>
                      {h.label} {h.col && <SortIcon col={h.col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx, i) => (
                  <tr key={tx.id ?? i} className="table-row">

                    {/* Date */}
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'nowrap' }}>{fmtDate(tx.date)}</td>

                    {/* Titre */}
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tx.title ?? '—'}</td>

                    {/* Source = income_category */}
                    <td style={{ padding: '11px 14px' }}>
                      {catName(tx.income_category) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3a0', display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{catName(tx.income_category)}</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                    </td>

                    {/* Destination = expense_category */}
                    <td style={{ padding: '11px 14px' }}>
                      {catName(tx.expense_category) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5476a', display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{catName(tx.expense_category)}</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '11px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 100,
                          background:
                            tx.type === 'income'
                              ? 'rgba(34,211,160,.12)'
                              : tx.type === 'transfer'
                              ? 'rgba(56,189,248,.12)'
                              : 'rgba(245,71,106,.12)', // expense par défaut

                          color:
                            tx.type === 'income'
                              ? '#22d3a0'
                              : tx.type === 'transfer'
                              ? '#38bdf8'
                              : '#f5476a',
                        }}
                      >
                        {tx.type === 'income'
                          ? 'Revenu'
                          : tx.type === 'transfer'
                          ? 'Transfert'
                          : 'Dépense'}
                      </span>
                    </td>

                    {/* Montant */}
                    <td
                      style={{
                        padding: '11px 14px',
                        textAlign: 'right',
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono,monospace',
                        color:
                          tx.type === 'income'
                            ? '#22d3a0'
                            : tx.type === 'transfer'
                            ? '#38bdf8'
                            : '#f5476a',
                      }}
                    >
                      {tx.type === 'transfer'
                        ? '↔'
                        : tx.type === 'income'
                        ? '+'
                        : '-'}
                      {fmtFull(tx.amount)}
                    </td>

                    {/* Méthode */}
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)' }}>{tx.payment_method ?? '—'}</td>

                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Page {page} / {totalPages} · {filtered.length} transactions</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { label: '«', action: () => setPage(1),         disabled: page === 1 },
                    { label: '‹', action: () => setPage(p => p-1), disabled: page === 1 },
                  ].map((b, i) => (
                    <button key={i} className="btn btn-ghost btn-sm" disabled={b.disabled} onClick={b.action}>{b.label}</button>
                  ))}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.min(Math.max(page - 2, 1) + i, totalPages)
                    return p
                  }).filter((p, i, a) => a.indexOf(p) === i).map(p => (
                    <button key={p} className="btn btn-ghost btn-sm" onClick={() => setPage(p)} style={{
                      minWidth: 32,
                      background: page === p ? 'rgba(124,108,252,.2)' : '',
                      color:      page === p ? 'var(--accent2)' : '',
                      border:     page === p ? '1px solid rgba(124,108,252,.25)' : '',
                    }}>{p}</button>
                  ))}
                  {[
                    { label: '›', action: () => setPage(p => p+1), disabled: page === totalPages },
                    { label: '»', action: () => setPage(totalPages), disabled: page === totalPages },
                  ].map((b, i) => (
                    <button key={i} className="btn btn-ghost btn-sm" disabled={b.disabled} onClick={b.action}>{b.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}