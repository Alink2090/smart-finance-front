import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const fmt = n => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0 }).format(n ?? 0)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
      <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color:p.color ?? p.fill, fontWeight:500 }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

export default function Analytics() {
  const { user } = useAuth()
  const [monthly, setMonthly] = useState([])
  const [catExp, setCatExp] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      analyticsAPI.monthlyExpenses(user.id),
      analyticsAPI.categoryExpenses(user.id),
      analyticsAPI.dashboard(user.id),
    ]).then(([m, c, d]) => {
      if (!active) return
      setMonthly(Array.isArray(m) ? m : (m?.data ?? []))
      setCatExp(Array.isArray(c) ? c : (c?.data ?? []))
      setSummary(d?.data ?? d)
    }).catch(e => { if (active) setErr(e.message) })
    .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const totalExp = catExp.reduce((s,c) => s + (c.amount ?? c.total ?? 0), 0)

  const pieData = catExp.map((c, i) => ({
    name: c.category?.name ?? c.category ?? c.name ?? `Cat ${i+1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? c.color ?? `hsl(${i*47},65%,55%)`
  }))

  const Sk = ({ h=200 }) => <div className="skeleton" style={{ height:h, borderRadius:12 }} />

  return (
    <div className="fade-up" style={{ padding:24 }}>
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-subtitle">Financial insights and trends</div>
      </div>

      {err && <div className="error-box" style={{ marginBottom:20 }}>{err}</div>}

      {/* Summary row */}
      {!loading && summary && (
        <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Total Income', value:fmt(summary.total_income), color:'var(--green)' },
            { label:'Total Expenses', value:fmt(summary.total_expenses), color:'var(--red)' },
            { label:'Net Balance', value:fmt(summary.balance), color:'var(--accent2)' },
            { label:'Savings Rate', value:summary.total_income > 0 ? `${(((summary.total_income - summary.total_expenses)/summary.total_income)*100).toFixed(1)}%` : '—', color:'var(--amber)' },
          ].map((s,i) => (
            <div key={i} className="card" style={{ flex:'1 1 140px', padding:'16px 20px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:s.color, letterSpacing:'-.02em', fontFamily:'JetBrains Mono,monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Row 1: bar + pie */}
      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
        {/* Horizontal bar - category breakdown */}
        <div className="card" style={{ flex:'1 1 360px', padding:24 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Spending by Category</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Current period</div>
          </div>
          {loading ? <Sk h={240} /> : catExp.length === 0 ? (
            <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pieData} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0,4,4,0]} name="Amount">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut + list */}
        <div className="card" style={{ flex:'1 1 260px', padding:24 }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Category Share</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>% of total expenses</div>
          </div>
          {loading ? <Sk h={160} /> : pieData.length === 0 ? (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v=>[fmt(v),'Amount']} contentStyle={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, fontSize:13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
            {pieData.map((d, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:d.color, display:'inline-block', flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--text2)' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>
                    {totalExp > 0 ? `${((d.value/totalExp)*100).toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="progress" style={{ height:4 }}>
                  <div className="progress-fill" style={{ width:totalExp>0?`${(d.value/totalExp)*100}%`:'0%', background:d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <div className="card" style={{ flex:'1 1 360px', padding:24 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Monthly Income vs Expenses</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Bar comparison</div>
          </div>
          {loading ? <Sk h={220} /> : monthly.length === 0 ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v=><span style={{fontSize:12,color:'var(--text2)'}}>{v}</span>} />
                <Bar dataKey="income" fill="#7c6cfc" name="Income" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Expenses" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ flex:'1 1 360px', padding:24 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Trend Line</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Income & expense evolution</div>
          </div>
          {loading ? <Sk h={220} /> : monthly.length === 0 ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v=><span style={{fontSize:12,color:'var(--text2)'}}>{v}</span>} />
                <Line type="monotone" dataKey="income" stroke="#7c6cfc" strokeWidth={2.5} dot={{ r:4, fill:'#7c6cfc', strokeWidth:0 }} name="Income" activeDot={{ r:6 }} />
                <Line type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2.5} dot={{ r:4, fill:'#f5476a', strokeWidth:0 }} name="Expenses" activeDot={{ r:6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
