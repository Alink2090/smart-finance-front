import { useState, useEffect, useCallback } from 'react'
import { budgetsAPI, categoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const fmt = n => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0 }).format(n ?? 0)

function BudgetForm({ categories, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { category_id:'', limit_amount:'', period:'monthly' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!initial?.id

  const handleSave = async () => {
    if (!form.category_id || !form.limit_amount) { setErr('Category and limit are required'); return }
    setErr('')
    setLoading(true)
    try {
      await onSave({ ...form, limit_amount: parseFloat(form.limit_amount) })
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay fade-in" onClick={onCancel}>
      <div className="modal-in" style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, padding:32, width:420, maxWidth:'92vw', boxShadow:'0 20px 80px rgba(0,0,0,.6)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{isEdit ? 'Edit Budget' : 'New Budget'}</h3>
          <button className="btn btn-ghost btn-sm" style={{ padding:'6px' }} onClick={onCancel}>✕</button>
        </div>
        {err && <div className="error-box" style={{ marginBottom:14 }}>{err}</div>}
        <div style={{ marginBottom:14 }}>
          <label className="input-label">Category *</label>
          <select className="input" value={form.category_id} onChange={e=>set('category_id',e.target.value)}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:14 }}>
          <label className="input-label">Budget Limit ($) *</label>
          <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 300" value={form.limit_amount} onChange={e=>set('limit_amount',e.target.value)} />
        </div>
        <div style={{ marginBottom:24 }}>
          <label className="input-label">Period</label>
          <select className="input" value={form.period} onChange={e=>set('period',e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2 }} onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : (isEdit ? 'Update Budget' : 'Create Budget')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="overlay fade-in" onClick={onCancel}>
      <div className="modal-in" style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, padding:32, width:380, maxWidth:'92vw', textAlign:'center', boxShadow:'0 20px 80px rgba(0,0,0,.6)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:32, marginBottom:16 }}>🗑️</div>
        <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Delete Budget?</h3>
        <p style={{ fontSize:14, color:'var(--text2)', marginBottom:24 }}>Are you sure you want to remove this budget limit?</p>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" style={{ flex:1 }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function Budgets() {
  const { user } = useAuth()
  const { success, error: toastErr } = useToast()
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editBudget, setEditBudget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setErr(null)
    try {
      const [bRes, cRes] = await Promise.all([budgetsAPI.getAll(user.id), categoriesAPI.getAll()])
      setBudgets(Array.isArray(bRes) ? bRes : (bRes?.data ?? bRes?.budgets ?? []))
      setCategories(Array.isArray(cRes) ? cRes : (cRes?.data ?? cRes?.categories ?? []))
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    data.user_id = user.id
    try {
      if (editBudget) {
        data.budget_id = editBudget.id
        await budgetsAPI.update(data)
        success('Budget updated')
      } else {
        await budgetsAPI.create(data)
        success('Budget created')
      }
      setShowForm(false)
      setEditBudget(null)
      load()
    } catch(e) { toastErr(e.message) }
  }

  const handleDelete = async () => {
    try {
      await budgetsAPI.delete(confirmDelete, user.id)
      success('Budget deleted')
      setConfirmDelete(null)
      load()
    } catch(e) { toastErr(e.message) }
  }

  const totalBudget = budgets.reduce((s,b) => s + (b.limit_amount ?? 0), 0)
  const totalSpent = budgets.reduce((s,b) => s + (b.spent_amount ?? 0), 0)
  const overCount = budgets.filter(b => (b.spent_amount ?? 0) > (b.limit_amount ?? 0)).length

  return (
    <div className="fade-up" style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div className="page-header" style={{ margin:0 }}>
          <div className="page-title">Budgets</div>
          <div className="page-subtitle">Track spending against limits</div>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditBudget(null);setShowForm(true)}}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Budget
        </button>
      </div>

      {!loading && budgets.length > 0 && (
        <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Total Budget', value:fmt(totalBudget), color:'var(--accent2)' },
            { label:'Total Spent', value:fmt(totalSpent), color:'var(--red)' },
            { label:'Remaining', value:fmt(totalBudget-totalSpent), color:'var(--green)' },
            { label:'Over Budget', value:`${overCount} item${overCount!==1?'s':''}`, color:'var(--amber)' },
          ].map((s,i) => (
            <div key={i} className="card" style={{ flex:'1 1 140px', padding:'16px 20px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:s.color, letterSpacing:'-.02em' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {err && <div className="error-box" style={{ marginBottom:16 }}>{err} <button className="btn btn-ghost btn-sm" style={{ marginLeft:8 }} onClick={load}>Retry</button></div>}

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:160, borderRadius:16 }} />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card" style={{ padding:'60px 20px', textAlign:'center', color:'var(--text3)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text2)' }}>No budgets yet</div>
          <div style={{ fontSize:13, marginBottom:20 }}>Create budgets to track your spending per category.</div>
          <button className="btn btn-primary" onClick={()=>setShowForm(true)}>Create your first budget</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {budgets.map((b, i) => {
            const limit = b.limit_amount ?? 0
            const spent = b.spent_amount ?? 0
            const pct = limit > 0 ? Math.min((spent/limit)*100, 100) : 0
            const over = spent > limit
            const warn = pct > 80 && !over
            const categoryObj = b.category && typeof b.category === 'object' ? b.category : categories.find(c=>String(c.id)===String(b.category_id))
            const catName = categoryObj?.name ?? `Budget ${b.category}`
            const catColor = categoryObj?.color ?? '#7c6cfc'

            return (
              <div key={b.id} className="card slide-right" style={{ padding:22, animationDelay:`${i*.05}s`, borderTop:`2px solid ${over?'var(--red)':warn?'var(--amber)':catColor}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:catColor+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:catColor }}>
                      {categoryObj?.icon ?? catName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{catName}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>{b.period ?? 'monthly'}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:over?'rgba(245,71,106,.12)':warn?'rgba(245,158,11,.12)':'rgba(34,211,160,.12)', color:over?'var(--red)':warn?'var(--amber)':'var(--green)', marginRight:4 }}>
                      {over ? 'Over' : warn ? 'Warning' : 'OK'}
                    </span>
                    <button className="btn btn-ghost btn-sm" style={{ padding:6, minWidth:0 }} onClick={()=>{setEditBudget(b);setShowForm(true)}}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ padding:6, minWidth:0, color:'var(--red)' }} onClick={()=>setConfirmDelete(b.id)}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </div>
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                  <span style={{ color:'var(--text2)' }}>Spent: <span style={{ fontWeight:700, color:over?'var(--red)':'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(spent)}</span></span>
                  <span style={{ color:'var(--text2)' }}>Limit: <span style={{ fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(limit)}</span></span>
                </div>

                <div className="progress" style={{ height:7, marginBottom:10 }}>
                  <div className="progress-fill" style={{
                    width:`${pct}%`, height:'100%',
                    background: over ? 'var(--red)' : warn ? 'var(--amber)' : `linear-gradient(90deg,${catColor},${catColor}99)`
                  }} />
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)' }}>
                  <span>{fmt(Math.max(0, limit-spent))} remaining</span>
                  <span style={{ fontWeight:700, color:over?'var(--red)':catColor }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showForm||editBudget) && (
        <BudgetForm categories={categories} initial={editBudget} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditBudget(null)}} />
      )}
      
      {confirmDelete && (
        <ConfirmDeleteModal onConfirm={handleDelete} onCancel={()=>setConfirmDelete(null)} />
      )}
    </div>
  )
}