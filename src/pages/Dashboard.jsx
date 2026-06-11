/**
 * Dashboard.jsx — Mobile-first redesign
 * Desktop: unchanged grid layout
 * Mobile: hero card + horizontal stat scroll + recent transactions
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI, transactionsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { InsightCard } from '../components/ui'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const fmt     = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtShort = n => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}
const fmtPct  = n => `${(n ?? 0).toFixed(1)}%`
const fmtAxis = v => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

function Sk({ w = '100%', h = 16, r = 6 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  )
}

/* ── Desktop StatCard ──────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon, loading }) {
  return (
    <div className="card" style={{ padding: 22, flex: '1 1 180px', minWidth: 170, borderLeft: `2px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 22, opacity: .12 }}>{icon}</div>
      {loading ? (
        <><Sk w={48} h={48} r={12} /><div style={{ height: 8 }} /><Sk w="60%" /><div style={{ height: 6 }} /><Sk w="40%" h={24} /></>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
        </>
      )}
    </div>
  )
}

/* ── Mobile Dashboard ──────────────────────────────────────────────────────── */
function MobileDashboard({ dashboard, monthly, catExp, insights, recentTxs, loading, navigate, user }) {
  const pieData = catExp.map((c, i) => ({
    name:  c.category?.name ?? c.name ?? `Cat ${i + 1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? c.color ?? `hsl(${i * 47},65%,55%)`,
  }))

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="mobile-page fade-up">

      {/* Hero card */}
      <div className="mobile-hero">
        <div className="mobile-hero-greeting">{greet()}, {user?.name?.split(' ')[0] ?? ''} 👋</div>
        <div className="mobile-hero-balance-label">Solde net</div>
        <div className="mobile-hero-balance">
          {loading ? '—' : fmtShort(dashboard?.balance)} FCFA
        </div>
        <div className="mobile-hero-row">
          <div className="mobile-hero-stat">
            <div className="mobile-hero-stat-label" style={{ color: 'var(--green)' }}>↑ Revenus</div>
            <div className="mobile-hero-stat-value" style={{ color: 'var(--green)' }}>
              {loading ? '—' : fmtShort(dashboard?.total_income)}
            </div>
          </div>
          <div className="mobile-hero-stat">
            <div className="mobile-hero-stat-label" style={{ color: 'var(--red)' }}>↓ Dépenses</div>
            <div className="mobile-hero-stat-value" style={{ color: 'var(--red)' }}>
              {loading ? '—' : fmtShort(dashboard?.total_expenses)}
            </div>
          </div>
          <div className="mobile-hero-stat">
            <div className="mobile-hero-stat-label" style={{ color: 'var(--amber)' }}>◎ Budget</div>
            <div className="mobile-hero-stat-value" style={{ color: 'var(--amber)' }}>
              {loading ? '—' : fmtPct(dashboard?.budget_usage_percent)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mobile-quick-actions">
        {[
          { label: 'Ajouter',     icon: '＋', to: '/transactions', color: '#7c6cfc', bg: 'rgba(124,108,252,.15)' },
          { label: 'Analytics',   icon: '∿',   to: '/analytics',   color: '#38bdf8', bg: 'rgba(56,189,248,.12)'  },
          { label: 'Budgets',     icon: '◎',   to: '/budgets',     color: '#f59e0b', bg: 'rgba(245,158,11,.12)'  },
          { label: 'Rapports',    icon: '📄',  to: '/reports',     color: '#22d3a0', bg: 'rgba(34,211,160,.12)'  },
          { label: 'Insights',    icon: '💡',  to: '/insights',    color: '#a78bfa', bg: 'rgba(167,139,250,.12)' },
        ].map((item, i) => (
          <button key={i} className="mobile-quick-btn" onClick={() => navigate(item.to)}>
            <div className="mobile-quick-btn-icon" style={{ background: item.bg, borderColor: item.color + '22' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
            </div>
            <span className="mobile-quick-btn-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Key metrics row */}
      {!loading && dashboard && (
        <>
          <div className="mobile-section-header">
            <span className="mobile-section-title">Indicateurs clés</span>
          </div>
          <div className="mobile-stats-row">
            <div className="mobile-stat-card">
              <div className="mobile-stat-card-accent" style={{ background: '#7c6cfc' }} />
              <div className="mobile-stat-label">Taux d'épargne</div>
              <div className="mobile-stat-value" style={{ color: (dashboard.savings_rate ?? 0) >= 20 ? 'var(--green)' : 'var(--amber)' }}>
                {fmtPct(dashboard.savings_rate)}
              </div>
              <div className="mobile-stat-sub">{(dashboard.savings_rate ?? 0) >= 20 ? '✓ Objectif atteint' : 'Objectif : 20%'}</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-card-accent" style={{ background: '#f5476a' }} />
              <div className="mobile-stat-label">Ratio dép./rev.</div>
              <div className="mobile-stat-value">{fmtPct(dashboard.expense_ratio)}</div>
              <div className="mobile-stat-sub">Idéal &lt; 80%</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-card-accent" style={{ background: '#22d3a0' }} />
              <div className="mobile-stat-label">Revenus</div>
              <div className="mobile-stat-value" style={{ color: 'var(--green)' }}>{fmtShort(dashboard.total_income)}</div>
              <div className="mobile-stat-sub">Cette période</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-card-accent" style={{ background: '#f59e0b' }} />
              <div className="mobile-stat-label">Dépenses</div>
              <div className="mobile-stat-value" style={{ color: 'var(--red)' }}>{fmtShort(dashboard.total_expenses)}</div>
              <div className="mobile-stat-sub">Cette période</div>
            </div>
          </div>
        </>
      )}

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <>
          <div className="mobile-section-header">
            <span className="mobile-section-title">Vue mensuelle</span>
            <button className="mobile-section-link" onClick={() => navigate('/analytics')}>Détails →</button>
          </div>
          <div className="mobile-chart-card">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Category pie */}
      {pieData.length > 0 && (
        <>
          <div className="mobile-section-header">
            <span className="mobile-section-title">Par catégorie</span>
            <button className="mobile-section-link" onClick={() => navigate('/analytics')}>Voir →</button>
          </div>
          <div className="mobile-chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0 }}>
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [fmt(v), 'Montant']} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>{fmtShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <>
          <div className="mobile-section-header">
            <span className="mobile-section-title">Insights</span>
            <button className="mobile-section-link" onClick={() => navigate('/insights')}>Tout voir →</button>
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.slice(0, 2).map(ins => (
              <InsightCard key={ins.id} insight={ins} compact />
            ))}
          </div>
        </>
      )}

      {/* Recent transactions */}
      {recentTxs.length > 0 && (
        <>
          <div className="mobile-section-header">
            <span className="mobile-section-title">Récentes</span>
            <button className="mobile-section-link" onClick={() => navigate('/transactions')}>Toutes →</button>
          </div>
          <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {recentTxs.map((tx, i) => {
              const isIncome = tx.type === 'income'
              const emoji = isIncome ? '💚' : '🔴'
              return (
                <div key={tx.id ?? i} className="mobile-tx-item">
                  <div className="mobile-tx-icon" style={{ background: isIncome ? 'rgba(34,211,160,.1)' : 'rgba(245,71,106,.1)' }}>
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                  </div>
                  <div className="mobile-tx-body">
                    <div className="mobile-tx-title">{tx.title || 'Transaction'}</div>
                    <div className="mobile-tx-meta">
                      {tx.date ? new Date(tx.date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                      {tx.payment_method ? ` · ${tx.payment_method}` : ''}
                    </div>
                  </div>
                  <div className="mobile-tx-amount" style={{ color: isIncome ? 'var(--green)' : 'var(--red)' }}>
                    {isIncome ? '+' : '-'}{fmtShort(tx.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {loading && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <Sk h={200} r={20} />
          <Sk h={120} r={16} />
          <Sk h={180} r={16} />
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}

/* ── Desktop Dashboard (unchanged) ────────────────────────────────────────── */
function DesktopDashboard({ dashboard, monthly, catExp, insights, loading, navigate, user }) {
  const pieData = catExp.map((c, i) => ({
    name:  c.category?.name ?? c.name ?? `Cat ${i + 1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? c.color ?? `hsl(${i * 47},65%,55%)`,
  }))

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="fade-up" style={{ padding: 24 }}>
      <div className="page-header">
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{today}</div>
        <div className="page-title">Bonjour, {user?.name?.split(' ')[0] ?? ''} 👋</div>
        <div className="page-subtitle">Voici votre aperçu financier</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Revenus"        value={loading ? '—' : fmt(dashboard?.total_income)}            color="#22d3a0" icon="↑" loading={loading} sub="Cette période" />
        <StatCard label="Dépenses"       value={loading ? '—' : fmt(dashboard?.total_expenses)}          color="#f5476a" icon="↓" loading={loading} sub="Cette période" />
        <StatCard label="Solde net"      value={loading ? '—' : fmt(dashboard?.balance)}                 color="#7c6cfc" icon="⬡" loading={loading} sub="Revenus − Dépenses" />
        <StatCard label="Budget utilisé" value={loading ? '—' : fmtPct(dashboard?.budget_usage_percent)} color="#f59e0b" icon="◎" loading={loading} sub="Du budget mensuel" />
      </div>

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Insights & Alertes</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Analyse automatique de vos finances</div>
            </div>
            <button onClick={() => navigate('/insights')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent2)', background: 'rgba(124,108,252,.08)', border: '1px solid rgba(124,108,252,.15)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map(ins => <InsightCard key={ins.id} insight={ins} compact />)}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '2 1 380px', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Vue mensuelle</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Revenus vs Dépenses</div>
            </div>
            <button onClick={() => navigate('/analytics')} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
              Analyse complète →
            </button>
          </div>
          {loading ? <Sk h={220} /> : monthly.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>Pas encore de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
                <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ flex: '1 1 260px', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Par catégorie</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Répartition des dépenses</div>
          </div>
          {loading ? <Sk h={160} /> : pieData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>Pas de données</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [fmt(v), 'Montant']} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Métriques rapides */}
      {!loading && dashboard && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: '1 1 180px', padding: '16px 20px', borderLeft: '2px solid #7c6cfc' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Taux d'épargne</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: (dashboard.savings_rate ?? 0) >= 20 ? '#22d3a0' : '#f59e0b', fontFamily: 'JetBrains Mono,monospace', marginBottom: 4 }}>{fmtPct(dashboard.savings_rate)}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{(dashboard.savings_rate ?? 0) >= 20 ? '✓ Objectif atteint' : 'Objectif : 20%'}</div>
          </div>
          <div className="card" style={{ flex: '1 1 180px', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Ratio dép./rev.</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace', marginBottom: 4 }}>{fmtPct(dashboard.expense_ratio)}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Idéal &lt; 80%</div>
          </div>
        </div>
      )}

      {/* Line chart */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Tendance financière</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Évolution revenus vs dépenses</div>
          </div>
        </div>
        {loading ? <Sk h={180} /> : monthly.length === 0 ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>Pas encore de données</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
              <Line type="monotone" dataKey="income"   stroke="#7c6cfc" strokeWidth={2.5} dot={{ r: 4, fill: '#7c6cfc', strokeWidth: 0 }} name="Revenus"  activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2.5} dot={{ r: 4, fill: '#f5476a', strokeWidth: 0 }} name="Dépenses" activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Raccourcis */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Analytics', to: '/analytics', icon: '∿', color: '#7c6cfc', sub: 'Tendances & projections' },
          { label: 'Insights',  to: '/insights',  icon: '💡', color: '#38bdf8', sub: 'Alertes & conseils'    },
          { label: 'Rapports',  to: '/reports',   icon: '📄', color: '#22d3a0', sub: 'Export CSV / PDF'      },
          { label: 'Budgets',   to: '/budgets',   icon: '◎',  color: '#f59e0b', sub: 'Périodes & limites'    },
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.to)} style={{ flex: '1 1 140px', padding: '14px 16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = item.color + '44'; e.currentTarget.style.background = item.color + '0a' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main export ───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const { isMobile } = useBreakpoint()

  const [dashboard, setDashboard] = useState(null)
  const [monthly,   setMonthly]   = useState([])
  const [catExp,    setCatExp]    = useState([])
  const [insights,  setInsights]  = useState([])
  const [recentTxs, setRecentTxs] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    setLoading(true)

    const recentPromise = transactionsAPI?.list
      ? transactionsAPI.list(user.id, { page: 1, page_size: 5 }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] })

    Promise.all([
      analyticsAPI.dashboard(user.id),
      analyticsAPI.monthlyExpenses(user.id, 6),
      analyticsAPI.categoryExpenses(user.id),
      analyticsAPI.insights(user.id),
      recentPromise,
    ])
    .then(([dash, mon, cat, ins, txs]) => {
      if (!active) return
      setDashboard(dash?.data ?? dash)
      setMonthly(mon?.data ?? [])
      setCatExp(cat?.data ?? [])
      setInsights((ins?.insights ?? []).slice(0, 3))
      const txList = txs?.data?.results ?? txs?.data ?? txs?.results ?? []
      setRecentTxs(Array.isArray(txList) ? txList.slice(0, 5) : [])
    })
    .catch(e => { if (active) setError(e.message) })
    .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [user?.id])

  const props = { dashboard, monthly, catExp, insights, recentTxs, loading, navigate, user }

  if (error) return (
    <div style={{ padding: 24 }}>
      <div className="error-box">
        {error}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    </div>
  )

  return isMobile
    ? <MobileDashboard {...props} />
    : <DesktopDashboard {...props} />
}
