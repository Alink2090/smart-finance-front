/**
 * Analytics.jsx — VERSION ALLÉGÉE
 *
 * AVANT : useFinanceCalcs() calculait tout côté front
 * APRÈS : /analytics/monthly-expenses/ retourne déjà metrics.* calculés par Django
 *
 * Supprimé : useFinanceCalcs, generateInsights, import hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { offlineAnalyticsAPI } from '../services/offlineApi'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useIsMobile } from '../hooks/useIsMobile'

const fmt     = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtPct  = n => `${(n ?? 0).toFixed(1)}%`
const fmtAxis = v => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

const PERIOD_OPTIONS = [
  { value: 3,  label: '3 mois' },
  { value: 6,  label: '6 mois' },
  { value: 12, label: '1 an'   },
]

function Sk({ h = 200, r = 10 }) {
  return <div className="skeleton" style={{ height: h, borderRadius: r }} />
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color ?? p.fill, fontWeight: 500 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

function PeriodFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 9, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {PERIOD_OPTIONS.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '7px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 12, fontWeight: 600, transition: 'all .15s',
          background: value === o.value ? 'rgba(124,108,252,.2)' : 'transparent',
          color: value === o.value ? 'var(--accent2)' : 'var(--text3)',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

function ProjectionDot(props) {
  const { cx, cy, payload } = props
  if (!payload?.is_projection) return <g />
  return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="var(--surface)" strokeWidth={2} />
}

export default function Analytics() {
  const { user } = useAuth()

  // Données brutes
  const [monthly,      setMonthly]      = useState([])
  const [catData,      setCatData]      = useState([])
  const [dashboard,    setDashboard]    = useState(null)
  // Métriques calculées par le back
  const [metrics,      setMetrics]      = useState(null)
  const [topCategory,  setTopCategory]  = useState(null)

  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState(null)
  const [period,   setPeriod]   = useState(6)
  const [chartType,setChartType]= useState('area')

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErr(null)
    try {
      const [dash, mon, cat] = await Promise.all([
        offlineAnalyticsAPI.dashboard(user.id),
        offlineAnalyticsAPI.monthlyExpenses(user.id, period),
        offlineAnalyticsAPI.categoryExpenses(user.id),
      ])

      setDashboard(dash?.data ?? dash)

      // Le back retourne { data: [...], metrics: {...} }
      setMonthly(mon?.data ?? [])
      setMetrics(mon?.metrics ?? null)

      // Le back retourne { data: [...], top_category: {...} }
      setCatData(cat?.data ?? [])
      setTopCategory(cat?.top_category ?? null)

    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user?.id, period])

  useEffect(() => { load() }, [load])

  // Données pie — aucun calcul
  const pieData = catData.map((c, i) => ({
    name:  c.category?.name ?? c.name ?? `Cat ${i + 1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? c.color ?? `hsl(${i * 47},65%,55%)`,
  }))

  const totalCatExp = pieData.reduce((s, d) => s + d.value, 0)

  // Données chart avec point projection (déjà calculé par le back)
  const chartData = metrics?.monthly_with_projection ?? monthly

  const isMobile = useIsMobile()

  // ── Mobile render ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="fade-up" style={{ padding: 16 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div className="page-title">Analytics</div>
            <div className="page-subtitle">Analyse de vos finances</div>
          </div>
        </div>

        {/* Sélecteur période */}
        <div style={{ display:'flex', gap:6, marginBottom:16, background:'var(--surface2)', borderRadius:12, padding:4, border:'1px solid var(--border)' }}>
          {[{v:3,l:'3 mois'},{v:6,l:'6 mois'},{v:12,l:'1 an'}].map(o => (
            <button key={o.v} onClick={()=>setPeriod(o.v)} style={{
              flex:1, padding:'8px', border:'none', borderRadius:9, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:700, transition:'all .15s',
              background: period===o.v ? 'rgba(124,108,252,.2)' : 'transparent',
              color: period===o.v ? 'var(--accent2)' : 'var(--text3)',
              boxShadow: period===o.v ? 'inset 0 0 0 1px rgba(124,108,252,.3)' : 'none',
            }}>{o.l}</button>
          ))}
        </div>

        {err && <div className="error-box" style={{ marginBottom:14, fontSize:13 }}>{err}</div>}

        {/* KPI grid 2×2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { label:"Revenus",        value: fmt(dashboard?.total_income),     color:'#22d3a0' },
            { label:"Dépenses",       value: fmt(dashboard?.total_expenses),   color:'#f5476a' },
            { label:"Taux d'épargne", value: fmtPct(dashboard?.savings_rate), color:'#7c6cfc' },
            { label:"Ratio dép.",     value: fmtPct(dashboard?.expense_ratio),color:'#f59e0b' },
          ].map((s,i) => (
            <div key={i} className="card" style={{ padding:'14px', borderLeft:`2px solid ${s.color}` }}>
              {loading
                ? <><div className="skeleton" style={{height:11,width:'60%',marginBottom:8,borderRadius:6}}/><div className="skeleton" style={{height:20,width:'80%',borderRadius:6}}/></>
                : <>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>{s.label}</div>
                    <div style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:'JetBrains Mono,monospace',letterSpacing:'-.02em',lineHeight:1}}>{s.value}</div>
                  </>
              }
            </div>
          ))}
        </div>

        {/* Chart principal */}
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Évolution mensuelle</div>
            <div style={{ display:'flex', background:'var(--surface2)', borderRadius:7, border:'1px solid var(--border)', overflow:'hidden' }}>
              {[['area','∿'],['bar','▬']].map(([v,ic]) => (
                <button key={v} onClick={()=>setChartType(v)} style={{
                  padding:'5px 10px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13,
                  background: chartType===v ? 'rgba(124,108,252,.2)' : 'transparent',
                  color: chartType===v ? 'var(--accent2)' : 'var(--text3)', transition:'all .15s',
                }}>{ic}</button>
              ))}
            </div>
          </div>
          {loading ? <Sk h={160} /> : monthly.length === 0
            ? <div style={{height:160,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:13}}>Pas encore de données</div>
            : <ResponsiveContainer width="100%" height={160}>
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gIncM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c6cfc" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#7c6cfc" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gExpM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f5476a" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#f5476a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:'var(--text3)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text3)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={34}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Area type="monotone" dataKey="income"   stroke="#7c6cfc" strokeWidth={2} fill="url(#gIncM)" name="Revenus"  dot={false} activeDot={{r:4}}/>
                    <Area type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2} fill="url(#gExpM)" name="Dépenses" dot={<ProjectionDot/>} activeDot={{r:4}}/>
                  </AreaChart>
                ) : (
                  <BarChart data={monthly} barSize={10} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:'var(--text3)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text3)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={34}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[3,3,0,0]}/>
                    <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[3,3,0,0]}/>
                  </BarChart>
                )}
              </ResponsiveContainer>
          }
        </div>

        {/* Répartition catégories */}
        {!loading && pieData.length > 0 && (
          <div className="card" style={{ padding:16, marginBottom:12 }}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:12}}>Par catégorie</div>
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={2} dataKey="value">
                    {pieData.map((d,i) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[fmt(v),'Montant']} contentStyle={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                {pieData.slice(0,4).map((d,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:d.color,display:'inline-block',flexShrink:0}}/>
                      <span style={{fontSize:11,color:'var(--text2)'}}>{d.name}</span>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>
                      {totalCatExp > 0 ? `${((d.value/totalCatExp)*100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {pieData.map((d,i) => (
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'var(--text2)'}}>{d.name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(d.value)}</span>
                </div>
                <div className="progress" style={{height:4}}>
                  <div className="progress-fill" style={{width:totalCatExp>0?`${(d.value/totalCatExp)*100}%`:'0%',height:'100%',background:d.color}}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comparaison mois */}
        {!loading && metrics?.curr && metrics?.prev && (
          <div className="card" style={{ padding:16, marginBottom:12 }}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:12}}>
              Comparaison {metrics.prev.month} → {metrics.curr.month}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {label:'Revenus',  curr:metrics.curr.income??0,   prev:metrics.prev.income??0,   good:true},
                {label:'Dépenses', curr:metrics.curr.expenses??0, prev:metrics.prev.expenses??0, good:false},
                {label:'Épargne',  curr:(metrics.curr.income??0)-(metrics.curr.expenses??0), prev:(metrics.prev.income??0)-(metrics.prev.expenses??0), good:true},
              ].map((row,i) => {
                const delta = row.prev>0 ? ((row.curr-row.prev)/row.prev)*100 : 0
                const up    = delta>0
                const isGood = row.good ? up : !up
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--surface2)',borderRadius:12,border:'1px solid var(--border)'}}>
                    <span style={{fontSize:13,color:'var(--text2)',fontWeight:500}}>{row.label}</span>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:14,fontWeight:800,color:'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(row.curr)}</div>
                      {row.prev>0 && <div style={{fontSize:11,color:isGood?'#22d3a0':'#f5476a',fontWeight:600,marginTop:1}}>{up?'↑':'↓'} {Math.abs(delta).toFixed(1)}%</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Métriques avancées */}
        {!loading && metrics && (
          <div className="card" style={{ padding:16 }}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:12}}>Métriques avancées</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                metrics.avg_monthly_expense && { label:'Moy. mensuelle dép.', value:fmt(metrics.avg_monthly_expense), color:'var(--text)' },
                metrics.projection_next_expense!=null && { label:'Projection M+1', value:fmt(metrics.projection_next_expense), color:'#f59e0b' },
                metrics.worst_month?.month && { label:'Mois le + chargé', value:metrics.worst_month.month, sub:fmt(metrics.worst_month.expenses), color:'#f59e0b' },
                metrics.anomaly && { label:'🔥 Anomalie détectée', value:metrics.anomaly.month, sub:`+${metrics.anomaly.deviation_pct?.toFixed(0)}% vs moy.`, color:'#f5476a' },
              ].filter(Boolean).map((item,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface2)',borderRadius:12,border:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text3)',fontWeight:500,flex:1}}>{item.label}</span>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:800,color:item.color,fontFamily:'JetBrains Mono,monospace'}}>{item.value}</div>
                    {item.sub && <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{item.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Desktop render ─────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Analyse approfondie de vos finances</div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {err && <div className="error-box" style={{ marginBottom: 20 }}>{err} <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={load}>Réessayer</button></div>}

      {/* KPIs — valeurs servies directement par Django */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Revenus',         value: fmt(dashboard?.total_income),      color: '#22d3a0', sub: metrics ? `↑ ${fmtPct(metrics.inc_growth)} vs préc.` : '—' },
          { label: 'Dépenses',        value: fmt(dashboard?.total_expenses),    color: '#f5476a', sub: metrics ? `↑ ${fmtPct(metrics.exp_growth)} vs préc.` : '—' },
          { label: "Taux d'épargne",  value: fmtPct(dashboard?.savings_rate),  color: '#7c6cfc', sub: (dashboard?.savings_rate ?? 0) >= 20 ? '✓ Objectif atteint' : 'Objectif : 20%' },
          { label: 'Ratio dép./rev.', value: fmtPct(dashboard?.expense_ratio), color: '#f59e0b', sub: 'Idéal < 80%' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ flex: '1 1 170px', padding: '16px 20px', borderLeft: `2px solid ${s.color}` }}>
            {loading ? (
              <><div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8, borderRadius: 6 }} /><div className="skeleton" style={{ height: 24, width: '80%', borderRadius: 6 }} /></>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono,monospace', letterSpacing: '-.02em' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.sub}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Métriques avancées servies par le back */}
      {!loading && metrics && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Moy. mensuelle dép.', value: fmt(metrics.avg_monthly_expense), color: 'var(--text)' },
            metrics.worst_month?.month && { label: 'Mois le + chargé', value: metrics.worst_month.month, sub: fmt(metrics.worst_month.expenses), color: '#f59e0b' },
            metrics.projection_next_expense != null && { label: 'Projection M+1', value: fmt(metrics.projection_next_expense), sub: 'Tendance linéaire', color: '#f59e0b', accent: true },
            topCategory && { label: 'Catégorie dominante', value: topCategory.name, sub: `${(topCategory.share_pct ?? 0).toFixed(0)}% des dépenses`, color: topCategory.color },
            metrics.anomaly && { label: '🔥 Anomalie', value: metrics.anomaly.month, sub: `+${metrics.anomaly.deviation_pct?.toFixed(0)}% vs moyenne`, color: '#f5476a', alert: true },
          ].filter(Boolean).map((item, i) => (
            <div key={i} className="card" style={{
              flex: '1 1 140px', padding: '14px 18px',
              borderLeft: item.alert ? '2px solid #f5476a' : item.accent ? '2px solid #f59e0b' : undefined,
              background: item.alert ? 'rgba(245,71,106,.04)' : undefined,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: item.alert ? '#f5476a' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>{item.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: item.color, fontFamily: 'JetBrains Mono,monospace' }}>{item.value}</div>
              {item.sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{item.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Chart principal */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Évolution mensuelle</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              {metrics?.projection_next_expense ? 'Point jaune = projection mois suivant (calculée côté serveur)' : 'Revenus vs dépenses dans le temps'}
            </div>
          </div>
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {[['area', '∿'], ['bar', '▬']].map(([v, ic]) => (
              <button key={v} onClick={() => setChartType(v)} style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                background: chartType === v ? 'rgba(124,108,252,.2)' : 'transparent',
                color: chartType === v ? 'var(--accent2)' : 'var(--text3)', transition: 'all .15s',
              }}>{ic}</button>
            ))}
          </div>
        </div>
        {loading ? <Sk h={260} /> : monthly.length === 0 ? (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Pas encore de données</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c6cfc" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#7c6cfc" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5476a" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f5476a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
                {metrics?.avg_monthly_expense > 0 && (
                  <ReferenceLine y={metrics.avg_monthly_expense} stroke="#f59e0b" strokeDasharray="4 4"
                    label={{ value: 'Moy.', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="income"   stroke="#7c6cfc" strokeWidth={2.5} fill="url(#gInc)" name="Revenus"  dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2.5} fill="url(#gExp)" name="Dépenses" dot={<ProjectionDot />} activeDot={{ r: 5 }} />
              </AreaChart>
            ) : (
              <BarChart data={monthly} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
                <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie + breakdown */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 240px', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Répartition dépenses</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Par catégorie</div>
          </div>
          {loading ? <Sk h={190} /> : pieData.length === 0 ? (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Pas de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={2} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v), 'Montant']} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ flex: '2 1 300px', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Détail par catégorie</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>% des dépenses totales</div>
          </div>
          {loading ? [1, 2, 3, 4].map(i => <Sk key={i} h={18} r={6} />) :
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
                      {totalCatExp > 0 ? `${((d.value / totalCatExp) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="progress" style={{ height: 5 }}>
                  <div className="progress-fill" style={{ width: totalCatExp > 0 ? `${(d.value / totalCatExp) * 100}%` : '0%', height: '100%', background: d.color }} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Comparaison mois — données servies par le back via metrics.curr/prev */}
      {!loading && metrics?.curr && metrics?.prev && (
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Comparaison mensuelle</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>{metrics.prev.month} → {metrics.curr.month}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Revenus',  curr: metrics.curr.income   ?? 0, prev: metrics.prev.income   ?? 0, positiveGood: true  },
              { label: 'Dépenses', curr: metrics.curr.expenses ?? 0, prev: metrics.prev.expenses ?? 0, positiveGood: false },
              { label: 'Épargne',  curr: (metrics.curr.income ?? 0) - (metrics.curr.expenses ?? 0), prev: (metrics.prev.income ?? 0) - (metrics.prev.expenses ?? 0), positiveGood: true },
            ].map((row, i) => {
              const delta = row.prev > 0 ? ((row.curr - row.prev) / row.prev) * 100 : 0
              const up    = delta > 0
              const good  = row.positiveGood ? up : !up
              return (
                <div key={i} style={{ flex: '1 1 150px', padding: '16px 18px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{row.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace', marginBottom: 6 }}>{fmt(row.curr)}</div>
                  {row.prev > 0 && (
                    <div style={{ fontSize: 12, color: good ? '#22d3a0' : '#f5476a', fontWeight: 600 }}>
                      {up ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs {fmt(row.prev)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}