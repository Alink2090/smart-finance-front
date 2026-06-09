import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { budgetsAPI, categoriesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const fmt  = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtD = d => d ? new Date(d+'T00:00').toLocaleDateString('fr-FR',{ day:'numeric', month:'short' }) : '—'

// Téléporte le modal dans document.body pour échapper à tout contexte CSS parent
function Portal({ children }) {
  return createPortal(children, document.body)
}

const OVERLAY = {
  position:'fixed', inset:0, background:'rgba(0,0,0,.75)',
  backdropFilter:'blur(10px)', zIndex:200,
  display:'flex', alignItems:'center', justifyContent:'center', padding:16,
}

// ── Statut ────────────────────────────────────────────────────────────────────
function getStatus(b) {
  const isSaving       = b.budget_type === 'saving'
  const isGlobalSaving = b.budget_type === 'saving_global'

  const limit = b.limit_amount ?? b.target_amount ?? 0
  const spent = b.spent_amount ?? b.saved_amount  ?? 0
  const pct   = limit > 0 ? (spent / limit) * 100 : 0

  const today  = new Date(); today.setHours(0,0,0,0)
  const start  = b.start_date ? new Date(b.start_date+'T00:00') : null
  const end    = b.end_date   ? new Date(b.end_date  +'T00:00') : null
  const past   = end   && today > end
  const future = start && today < start

  if (past && pct >= 100)              return { key:'completed', label: isSaving||isGlobalSaving ? 'Objectif atteint' : 'Terminé',  color:'#a78bfa', bg:'rgba(167,139,250,.12)', icon:'✓' }
  if (past && pct < 100 && !isSaving && !isGlobalSaving) return { key:'saved',     label:'Économisé',    color:'#22d3a0', bg:'rgba(34,211,160,.12)',  icon:'✦' }
  if (past && pct < 100 && (isSaving||isGlobalSaving))   return { key:'missed',    label:'Non atteint',  color:'#f59e0b', bg:'rgba(245,158,11,.12)',  icon:'✕' }
  if (future)                          return { key:'future',    label:'À venir',     color:'#38bdf8', bg:'rgba(56,189,248,.12)',  icon:'◷' }
  if (!isSaving && !isGlobalSaving && spent > limit && limit > 0) return { key:'over', label:'Dépassé', color:'#f5476a', bg:'rgba(245,71,106,.12)', icon:'⚠' }
  if (pct >= 100 && (isSaving||isGlobalSaving)) return { key:'completed', label:'Objectif atteint', color:'#a78bfa', bg:'rgba(167,139,250,.12)', icon:'✓' }
  if (!isSaving && !isGlobalSaving && pct >= 80) return { key:'warning', label:'Attention', color:'#f59e0b', bg:'rgba(245,158,11,.12)', icon:'!' }
  if (!past && !future)                return { key:'active',    label:'Actif',        color:'#22d3a0', bg:'rgba(34,211,160,.12)',  icon:'●' }
  return                                      { key:'idle',      label:'Inactif',      color:'#55556a', bg:'var(--surface3)',        icon:'○' }
}

function matchesTab(b, tab) {
  const s = getStatus(b)
  if (tab === 'all')      return true
  if (tab === 'active')   return ['active','warning'].includes(s.key)
  if (tab === 'upcoming') return s.key === 'future'
  if (tab === 'exceeded') return s.key === 'over'
  if (tab === 'done')     return ['saved','completed','missed'].includes(s.key)
  return true
}

function getDaysLeft(end_date) {
  if (!end_date) return null
  const today = new Date(); today.setHours(0,0,0,0)
  return Math.ceil((new Date(end_date+'T00:00') - today) / 86400000)
}
function getTimePct(start_date, end_date) {
  if (!start_date || !end_date) return null
  const now=Date.now(), s=new Date(start_date+'T00:00').getTime(), e=new Date(end_date+'T00:00').getTime()
  if (e<=s) return 100
  return Math.min(100, Math.max(0, ((now-s)/(e-s))*100))
}
function getDuration(start_date, end_date) {
  if (!start_date || !end_date) return null
  return Math.ceil((new Date(end_date+'T00:00')-new Date(start_date+'T00:00'))/86400000)
}

// ── Formulaire ────────────────────────────────────────────────────────────────
function BudgetForm({ categories, initial, defaultType, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(() => initial ? {
    budget_type:      initial.budget_type ?? defaultType ?? 'budget',
    name:             initial.name ?? '',
    category_id:      String(initial.category_id ?? initial.category?.id ?? ''),
    limit_amount:     String(initial.limit_amount ?? initial.target_amount ?? ''),
    savings_pct:      String(initial.savings_pct ?? ''),
    start_date:       initial.start_date ?? today,
    end_date:         initial.end_date ?? '',
    notes:            initial.notes ?? '',
  } : {
    budget_type: defaultType ?? 'budget',
    name:'', category_id:'', limit_amount:'', savings_pct:'',
    start_date:today, end_date:'', notes:'',
  })

  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const isBudget       = form.budget_type === 'budget'
  const isSaving       = form.budget_type === 'saving'
  const isGlobalSaving = form.budget_type === 'saving_global'
  const accentColor    = isGlobalSaving ? '#a78bfa' : isSaving ? '#22d3a0' : '#7c6cfc'

  const applyShortcut = days => {
    const s=new Date(); s.setHours(0,0,0,0)
    const e=new Date(s); e.setDate(e.getDate()+days-1)
    setForm(f=>({...f, start_date:s.toISOString().split('T')[0], end_date:e.toISOString().split('T')[0]}))
  }
  const applyThisMonth = () => {
    const now=new Date()
    const s=new Date(now.getFullYear(),now.getMonth(),1)
    const e=new Date(now.getFullYear(),now.getMonth()+1,0)
    setForm(f=>({...f, start_date:s.toISOString().split('T')[0], end_date:e.toISOString().split('T')[0]}))
  }

  const duration    = form.start_date && form.end_date && form.end_date > form.start_date ? getDuration(form.start_date, form.end_date) : null
  const dailyAmount = duration && form.limit_amount ? parseFloat(form.limit_amount)/duration : null

  const handleSave = async () => {
    if (!form.name)       { setErr('Donnez un nom'); return }
    if (!form.start_date) { setErr('Date de début requise'); return }
    if (!form.end_date)   { setErr('Date de fin requise'); return }
    if (form.end_date <= form.start_date) { setErr('La fin doit être après le début'); return }
    if (!isGlobalSaving && !form.category_id) { setErr('Sélectionnez une catégorie'); return }
    if (!isGlobalSaving && !form.limit_amount) { setErr(isSaving ? 'Entrez un objectif' : 'Entrez une limite'); return }
    if (isGlobalSaving && !form.savings_pct && !form.limit_amount) { setErr('Entrez un % ou un montant fixe'); return }

    setErr(''); setLoading(true)
    try {
      await onSave({
        ...form,
        limit_amount:  isSaving ? 0 : (isGlobalSaving && !form.limit_amount ? 0 : parseFloat(form.limit_amount||0)),
        target_amount: (isSaving || isGlobalSaving) ? parseFloat(form.limit_amount||0) : 0,
        savings_pct:   isGlobalSaving && form.savings_pct ? parseFloat(form.savings_pct) : null,
      })
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Portal>
      <div style={OVERLAY} onClick={onCancel}>
        <div className="modal-in" onClick={e=>e.stopPropagation()} style={{
          background:'var(--surface)', border:`1px solid ${accentColor}22`, borderRadius:22,
          padding:32, width:540, maxWidth:'96vw', maxHeight:'94vh', overflowY:'auto',
          boxShadow:`0 24px 80px rgba(0,0,0,.65), 0 0 0 1px ${accentColor}10 inset`,
          position:'relative', boxSizing:'border-box',
        }}>
          <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:2, borderRadius:1, background:`linear-gradient(90deg,transparent,${accentColor}80,transparent)` }}/>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{initial?.id ? 'Modifier' : 'Nouvelle enveloppe'}</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Définissez votre enveloppe budgétaire</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ padding:'6px' }} onClick={onCancel}>✕</button>
          </div>

          {/* ── Sélection du type */}
          <div style={{ marginBottom:20 }}>
            <label className="input-label">Type d'enveloppe</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { v:'budget',        label:'💸 Budget',           desc:'Limite de dépenses',             color:'#7c6cfc' },
                { v:'saving',        label:'🏦 Épargne',          desc:'Objectif par catégorie',         color:'#22d3a0' },
                { v:'saving_global', label:'🌍 Épargne globale',  desc:'% ou montant sur tous revenus',  color:'#a78bfa' },
              ].map(opt=>(
                <button key={opt.v} onClick={()=>set('budget_type',opt.v)} style={{
                  padding:'10px 12px', border:`1px solid ${form.budget_type===opt.v ? opt.color+'50' : 'var(--border)'}`,
                  borderRadius:10, cursor:'pointer', fontFamily:'inherit', transition:'all .2s', textAlign:'left',
                  background: form.budget_type===opt.v ? `${opt.color}15` : 'var(--surface2)',
                }}>
                  <div style={{ fontSize:13, fontWeight:700, color:form.budget_type===opt.v ? opt.color : 'var(--text2)', marginBottom:3 }}>{opt.label}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', lineHeight:1.4 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {err && <div className="error-box" style={{ marginBottom:16 }}>{err}</div>}

          {/* Nom */}
          <div style={{ marginBottom:14 }}>
            <label className="input-label">Nom *</label>
            <input className="input"
              placeholder={isGlobalSaving ? 'Ex : Épargne mensuelle sur salaire…' : isSaving ? 'Ex : Fonds urgence, Vacances…' : 'Ex : Courses, Transport…'}
              value={form.name} onChange={e=>set('name',e.target.value)} autoFocus/>
          </div>

          {/* Catégorie + montant */}
          {!isGlobalSaving && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <label className="input-label">Catégorie *</label>
                <select className="input" value={form.category_id} onChange={e=>set('category_id',e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {categories
                  .filter((c) => isSaving ? c.type === 'income' || c.type === 'both' : c.type === 'expense' || c.type === 'both')
                  .map(c=><option key={c.id} value={String(c.id)}>{c.icon?c.icon+' ':''}{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">{isSaving ? 'Objectif (FCFA) *' : 'Limite (FCFA) *'}</label>
                <input className="input" type="number" min="0" step="1" placeholder="ex. 50 000"
                  value={form.limit_amount} onChange={e=>set('limit_amount',e.target.value)}/>
              </div>
            </div>
          )}

          {/* Épargne globale */}
          {isGlobalSaving && (
            <div style={{ marginBottom:16, padding:'16px', background:'var(--surface2)', borderRadius:12, border:'1px solid rgba(167,139,250,.2)' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>
                Paramètres d'épargne globale
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label className="input-label">% des revenus du mois</label>
                  <div style={{ position:'relative' }}>
                    <input className="input" type="number" min="0" max="100" step="1" placeholder="ex. 20"
                      value={form.savings_pct} onChange={e=>set('savings_pct',e.target.value)} style={{ paddingRight:32 }}/>
                    <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:14, fontWeight:700 }}>%</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Le backend calcule dynamiquement l'objectif chaque mois</div>
                </div>
                <div>
                  <label className="input-label">OU montant fixe (FCFA)</label>
                  <input className="input" type="number" min="0" step="1" placeholder="ex. 50 000"
                    value={form.limit_amount} onChange={e=>set('limit_amount',e.target.value)}/>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Prioritaire sur le % si renseigné</div>
                </div>
              </div>
              {form.savings_pct && !form.limit_amount && (
                <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(167,139,250,.08)', borderRadius:8, fontSize:12, color:'#a78bfa', border:'1px solid rgba(167,139,250,.15)' }}>
                  🌍 Objectif = <strong>{form.savings_pct}%</strong> × revenus totaux du mois · calculé automatiquement par le serveur
                </div>
              )}
            </div>
          )}

          {/* Raccourcis + dates */}
          <div style={{ marginBottom:12 }}>
            <label className="input-label">Période — raccourcis</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {[
                { label:'Ce mois',     fn: applyThisMonth },
                { label:'7 jours',     fn: ()=>applyShortcut(7)   },
                { label:'30 jours',    fn: ()=>applyShortcut(30)  },
                { label:'90 jours',    fn: ()=>applyShortcut(90)  },
                { label:'6 mois',      fn: ()=>applyShortcut(182) },
                { label:'Cette année', fn: ()=>{ const y=new Date().getFullYear(); setForm(f=>({...f,start_date:`${y}-01-01`,end_date:`${y}-12-31`})) }},
              ].map(r=>(
                <button key={r.label} onClick={r.fn} className="btn btn-ghost btn-sm" style={{ fontSize:11 }}>{r.label}</button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label className="input-label">Début *</label>
                <input className="input" type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)}/>
              </div>
              <div>
                <label className="input-label">Fin *</label>
                <input className="input" type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Résumé calculé */}
          {duration && !isGlobalSaving && (
            <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--surface2)', borderRadius:10, border:`1px solid ${accentColor}20`, fontSize:12, color:'var(--text2)', display:'flex', gap:16, flexWrap:'wrap' }}>
              <span>📅 <strong style={{color:'var(--text)'}}>{duration}</strong> jours</span>
              {dailyAmount && <span>{isSaving?'💰 À épargner':'💸 Autorisé'} <strong style={{color:accentColor}}>{fmt(dailyAmount)}</strong>/jour</span>}
              {dailyAmount && <span>par semaine <strong style={{color:accentColor}}>{fmt(dailyAmount*7)}</strong></span>}
            </div>
          )}
          {duration && isGlobalSaving && (
            <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--surface2)', borderRadius:10, border:'1px solid rgba(167,139,250,.2)', fontSize:12, color:'var(--text2)' }}>
              📅 <strong style={{color:'var(--text)'}}>{duration}</strong> jours · Objectif recalculé chaque mois par le serveur
            </div>
          )}

          <div style={{ marginBottom:24 }}>
            <label className="input-label">Notes</label>
            <textarea className="input" rows={2} style={{ resize:'none' }}
              placeholder={isGlobalSaving ? 'Ex : virement auto le 5 de chaque mois…' : isSaving ? "Ex : pour les vacances d'été…" : 'Ex : inclut restaurants et marchés…'}
              value={form.notes} onChange={e=>set('notes',e.target.value)}/>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Annuler</button>
            <button disabled={loading} onClick={handleSave} style={{
              flex:2, padding:'11px', border:'none', borderRadius:10, fontFamily:'inherit',
              fontWeight:700, fontSize:14, cursor:loading?'not-allowed':'pointer',
              background: isGlobalSaving ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : isSaving ? 'linear-gradient(135deg,#22d3a0,#059669)' : 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
              color:'white', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: isGlobalSaving ? '0 4px 16px rgba(167,139,250,.3)' : isSaving ? '0 4px 16px rgba(34,211,160,.3)' : '0 4px 16px rgba(124,108,252,.3)',
              opacity:loading?.6:1, transition:'all .2s',
            }}>
              {loading ? <><span className="spinner"/> Enregistrement…</> : (
                initial?.id ? 'Mettre à jour' :
                isGlobalSaving ? "🌍 Créer l'épargne globale" :
                isSaving ? '🏦 Créer l\'épargne' : '💸 Créer le budget'
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

// ── Confirm delete ────────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <Portal>
      <div style={OVERLAY} onClick={onCancel}>
        <div className="modal-in" onClick={e=>e.stopPropagation()} style={{
          background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20,
          padding:32, width:380, maxWidth:'92vw', boxShadow:'0 20px 80px rgba(0,0,0,.6)',
          boxSizing:'border-box',
        }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'rgba(245,71,106,.1)', border:'1px solid rgba(245,71,106,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, fontSize:24 }}>🗑️</div>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Supprimer ?</h3>
          <p style={{ fontSize:14, color:'var(--text2)', marginBottom:24, lineHeight:1.6 }}>Cette action est irréversible.</p>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Annuler</button>
            <button className="btn btn-danger" style={{ flex:1 }} onClick={onConfirm}>Supprimer</button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

// ── Carte budget dépense ──────────────────────────────────────────────────────
function BudgetCard({ b, categories, onEdit, onDelete, idx }) {
  const status = b._status
  const limit  = b.limit_amount ?? 0
  const spent  = b.spent_amount ?? 0
  const pct    = limit > 0 ? Math.min((spent/limit)*100, 100) : 0
  const tPct   = getTimePct(b.start_date, b.end_date)
  const dl     = getDaysLeft(b.end_date)
  const dur    = getDuration(b.start_date, b.end_date)
  const catObj = b.category && typeof b.category==='object' ? b.category : categories.find(c=>String(c.id)===String(b.category_id))
  const catName  = catObj?.name  ?? b.name ?? `Budget #${b.id}`
  const catColor = catObj?.color ?? '#7c6cfc'
  const catIcon  = catObj?.icon  ?? catName[0]?.toUpperCase()

  const elapsed      = tPct!==null&&dur ? Math.max(1, Math.round((tPct/100)*dur)) : null
  const dailyRate    = elapsed&&elapsed>0 ? spent/elapsed : null
  const projected    = dailyRate&&dur ? dailyRate*dur : null
  const willExceed   = projected && projected > limit
  const dailyAllowed = dl&&dl>0 ? Math.max(0,limit-spent)/dl : null

  return (
    <div className="card slide-right" style={{ padding:22, animationDelay:`${idx*.04}s`, borderTop:`2px solid ${status.color}`, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:catColor+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, border:`1px solid ${catColor}30` }}>{catIcon}</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{b.name||catName}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, fontFamily:'JetBrains Mono,monospace' }}>
              {b.start_date ? `${fmtD(b.start_date)} → ${fmtD(b.end_date)}` : '—'}{dur ? ` · ${dur}j` : ''}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:status.bg, color:status.color }}>{status.icon} {status.label}</span>
          <button className="btn btn-ghost btn-sm" style={{ padding:5, minWidth:0 }} onClick={()=>onEdit(b)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding:5, minWidth:0 }} onClick={()=>onDelete(b.id)}
            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'} onMouseLeave={e=>e.currentTarget.style.color=''}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
        <span style={{ color:'var(--text2)' }}>Dépensé <span style={{ fontWeight:700, color:spent>limit?'#f5476a':'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(spent)}</span></span>
        <span style={{ color:'var(--text2)' }}>Limite <span style={{ fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(limit)}</span></span>
      </div>
      <div style={{ marginBottom:4 }}>
        <div className="progress" style={{ height:8, borderRadius:100 }}>
          <div className="progress-fill" style={{ width:`${pct}%`, height:'100%', background:spent>limit?'#f5476a':pct>80?'#f59e0b':`linear-gradient(90deg,${catColor},${catColor}88)` }}/>
        </div>
      </div>
      {tPct!==null && (
        <div style={{ marginBottom:8 }}>
          <div className="progress" style={{ height:3 }}>
            <div className="progress-fill" style={{ width:`${tPct}%`, height:'100%', background:'rgba(255,255,255,.15)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10, color:'var(--text3)' }}>
            <span>Temps {tPct.toFixed(0)}%</span><span>Budget {pct.toFixed(0)}%</span>
          </div>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ color:'var(--text3)' }}>{spent>limit ? <span style={{color:'#f5476a'}}>⚠ +{fmt(spent-limit)}</span> : <span>{fmt(Math.max(0,limit-spent))} restants</span>}</span>
        <span style={{ fontWeight:700, color:spent>limit?'#f5476a':catColor }}>{pct.toFixed(0)}%</span>
      </div>
      {(dl||willExceed||status.key==='saved') && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4, display:'flex', flexDirection:'column', gap:4 }}>
          {dl&&dl>0&&status.key!=='saved' && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)' }}>
              <span>⏱ <strong style={{color:'var(--text)'}}>{dl}</strong>j restants</span>
              {dailyAllowed!==null && <span>Max <strong style={{color:dailyAllowed<0?'#f5476a':'var(--text)'}}>{fmt(dailyAllowed)}</strong>/j</span>}
            </div>
          )}
          {willExceed&&status.key!=='over' && <div style={{ fontSize:11, color:'#f59e0b' }}>! Projection : {fmt(projected)} — risque dépassement</div>}
          {dailyRate&&status.key==='active'&&!willExceed && <div style={{ fontSize:11, color:'var(--text3)' }}>Rythme : <strong style={{color:'var(--text)'}}>{fmt(dailyRate)}</strong>/j</div>}
          {status.key==='saved' && <div style={{ fontSize:11, color:'#22d3a0' }}>✦ Terminé · {fmt(Math.max(0,limit-spent))} économisés</div>}
        </div>
      )}
      {b.notes && <div style={{ marginTop:8, fontSize:11, color:'var(--text3)', fontStyle:'italic', borderTop:'1px solid var(--border)', paddingTop:8 }}>{b.notes}</div>}
    </div>
  )
}

// ── Carte épargne par catégorie ───────────────────────────────────────────────
function SavingCard({ b, categories, onEdit, onDelete, idx }) {
  const status  = b._status
  const target  = b.target_amount ?? b.limit_amount ?? 0
  const saved   = b.saved_amount  ?? b.spent_amount ?? 0
  const pct     = target > 0 ? Math.min((saved/target)*100, 100) : 0
  const tPct    = getTimePct(b.start_date, b.end_date)
  const dl      = getDaysLeft(b.end_date)
  const dur     = getDuration(b.start_date, b.end_date)
  const catObj  = b.category && typeof b.category==='object' ? b.category : categories.find(c=>String(c.id)===String(b.category_id))
  const catName = catObj?.name ?? b.name ?? `Épargne #${b.id}`
  const elapsed     = tPct!==null&&dur ? Math.max(1, Math.round((tPct/100)*dur)) : null
  const dailySaved  = elapsed&&elapsed>0 ? saved/elapsed : null
  const projected   = dailySaved&&dur ? dailySaved*dur : null
  const willReach   = projected && projected >= target
  const remaining   = Math.max(0, target-saved)
  const dailyNeeded = dl&&dl>0 ? remaining/dl : null
  const milestone   = pct>=100?'🏆':pct>=75?'🎯':pct>=50?'💪':pct>=25?'🌱':'🚀'

  return (
    <div className="card slide-right" style={{ padding:22, animationDelay:`${idx*.04}s`, borderTop:'2px solid #22d3a0', display:'flex', flexDirection:'column', background:pct>=100?'rgba(34,211,160,.03)':'var(--surface)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>

          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(34,211,160,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, border:'1px solid rgba(34,211,160,.2)' }}>{milestone}</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{b.name||catName}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, fontFamily:'JetBrains Mono,monospace' }}>
              {b.start_date ? `${fmtD(b.start_date)} → ${fmtD(b.end_date)}` : 'Période libre'}{dur?` · ${dur}j`:''}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:status.bg, color:status.color }}>{status.icon} {status.label}</span>
          <button className="btn btn-ghost btn-sm" style={{ padding:5, minWidth:0 }} onClick={()=>onEdit(b)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding:5, minWidth:0 }} onClick={()=>onDelete(b.id)}
            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'} onMouseLeave={e=>e.currentTarget.style.color=''}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
        <span style={{ color:'var(--text2)' }}>Épargné <span style={{ fontWeight:700, color:'#22d3a0', fontFamily:'JetBrains Mono,monospace' }}>{fmt(saved)}</span></span>
        <span style={{ color:'var(--text2)' }}>Objectif <span style={{ fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(target)}</span></span>
      </div>
      <div style={{ marginBottom:4 }}>
        <div className="progress" style={{ height:10, borderRadius:100 }}>
          <div className="progress-fill" style={{ width:`${pct}%`, height:'100%', background:pct>=100?'linear-gradient(90deg,#22d3a0,#a78bfa)':'linear-gradient(90deg,#22d3a0,#34d399)', boxShadow:pct>=100?'0 0 12px rgba(34,211,160,.4)':'none', transition:'width .8s cubic-bezier(.34,1.56,.64,1)' }}/>
        </div>
      </div>
      {tPct!==null && (
        <div style={{ marginBottom:8 }}>
          <div className="progress" style={{ height:3 }}>
            <div className="progress-fill" style={{ width:`${tPct}%`, height:'100%', background:'rgba(255,255,255,.15)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10, color:'var(--text3)' }}>
            <span>Temps {tPct.toFixed(0)}%</span><span>Épargne {pct.toFixed(0)}%</span>
          </div>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
        <span style={{ color:'var(--text3)' }}>{pct>=100 ? <span style={{color:'#a78bfa',fontWeight:600}}>🏆 Objectif atteint !</span> : <span>{fmt(remaining)} restants</span>}</span>
        <span style={{ fontWeight:700, color:'#22d3a0' }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, marginTop:2, display:'flex', flexDirection:'column', gap:4 }}>
        {dl&&dl>0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)' }}>
            <span>⏱ <strong style={{color:'var(--text)'}}>{dl}</strong>j restants</span>
            {dailyNeeded!==null&&pct<100 && <span>À épargner <strong style={{color:'#22d3a0'}}>{fmt(dailyNeeded)}</strong>/j</span>}
          </div>
        )}
        {dailySaved&&status.key==='active' && (
          <div style={{ fontSize:11, color:'var(--text3)' }}>
            Rythme : <strong style={{color:'#22d3a0'}}>{fmt(dailySaved)}</strong>/j
            {projected && <span style={{ color:willReach?'#22d3a0':'#f59e0b', marginLeft:8 }}>{willReach ? `→ ${fmt(projected)}` : `→ Seulement ${fmt(projected)}`}</span>}
          </div>
        )}
      </div>
      {b.notes && <div style={{ marginTop:8, fontSize:11, color:'var(--text3)', fontStyle:'italic', borderTop:'1px solid var(--border)', paddingTop:8 }}>{b.notes}</div>}
    </div>
  )
}

// ── Carte épargne globale ─────────────────────────────────────────────────────
function GlobalSavingCard({ b, onEdit, onDelete, idx }) {
  const status  = b._status
  const target  = b.target_amount ?? 0
  const saved   = b.saved_amount  ?? 0
  const pct     = target > 0 ? Math.min((saved/target)*100, 100) : 0
  const dl      = getDaysLeft(b.end_date)
  const tPct    = getTimePct(b.start_date, b.end_date)
  const remaining = Math.max(0, target-saved)

  return (
    <div className="card slide-right" style={{ padding:22, animationDelay:`${idx*.04}s`, borderTop:'2px solid #a78bfa', display:'flex', flexDirection:'column', background:'rgba(167,139,250,.03)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(167,139,250,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, border:'1px solid rgba(167,139,250,.25)' }}>🌍</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{b.name}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
              {b.savings_pct && (
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'rgba(167,139,250,.15)', color:'#a78bfa' }}>
                  {b.savings_pct}% des revenus
                </span>
              )}
              <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace' }}>
                {b.start_date ? `${fmtD(b.start_date)} → ${fmtD(b.end_date)}` : '—'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:status.bg, color:status.color }}>{status.icon} {status.label}</span>
          <button className="btn btn-ghost btn-sm" style={{ padding:5, minWidth:0 }} onClick={()=>onEdit(b)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding:5, minWidth:0 }} onClick={()=>onDelete(b.id)}
            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'} onMouseLeave={e=>e.currentTarget.style.color=''}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
        <span style={{ color:'var(--text2)' }}>Épargné <span style={{ fontWeight:700, color:'#a78bfa', fontFamily:'JetBrains Mono,monospace' }}>{fmt(saved)}</span></span>
        <span style={{ color:'var(--text2)' }}>
          Objectif ce mois <span style={{ fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>
            {target > 0 ? fmt(target) : <span style={{color:'var(--text3)'}}>calculé par le serveur</span>}
          </span>
        </span>
      </div>
      <div style={{ marginBottom:4 }}>
        <div className="progress" style={{ height:10, borderRadius:100 }}>
          <div className="progress-fill" style={{ width:`${pct}%`, height:'100%', background:pct>=100?'linear-gradient(90deg,#a78bfa,#7c3aed)':'linear-gradient(90deg,#a78bfa,#c4b5fd)', boxShadow:pct>=100?'0 0 12px rgba(167,139,250,.4)':'none', transition:'width .8s cubic-bezier(.34,1.56,.64,1)' }}/>
        </div>
      </div>
      {tPct!==null && (
        <div style={{ marginBottom:8 }}>
          <div className="progress" style={{ height:3 }}>
            <div className="progress-fill" style={{ width:`${tPct}%`, height:'100%', background:'rgba(255,255,255,.15)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10, color:'var(--text3)' }}>
            <span>Temps {tPct?.toFixed(0)}%</span><span>Épargne {pct.toFixed(0)}%</span>
          </div>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ color:'var(--text3)' }}>{pct>=100 ? <span style={{color:'#a78bfa',fontWeight:600}}>🏆 Objectif du mois atteint !</span> : <span>{target>0?fmt(remaining)+' restants':'En attente du calcul serveur'}</span>}</span>
        <span style={{ fontWeight:700, color:'#a78bfa' }}>{pct.toFixed(0)}%</span>
      </div>
      {dl&&dl>0 && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4, fontSize:11, color:'var(--text3)' }}>
          ⏱ <strong style={{color:'var(--text)'}}>{dl}</strong>j restants dans la période
        </div>
      )}
      {b.notes && <div style={{ marginTop:8, fontSize:11, color:'var(--text3)', fontStyle:'italic', borderTop:'1px solid var(--border)', paddingTop:8 }}>{b.notes}</div>}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Budgets() {
  const { user } = useAuth()
  const { success, error: toastErr } = useToast()

  const [budgets,       setBudgets]       = useState([])
  const [categories,    setCategories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [err,           setErr]           = useState(null)
  const [showForm,      setShowForm]      = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [defaultType,   setDefaultType]   = useState('budget')
  const [mainTab,       setMainTab]       = useState('budget')
  const [subTab,        setSubTab]        = useState('active')
  const [viewMode,      setViewMode]      = useState('grid')
  const [search,        setSearch]        = useState('')
  const [filterCat,     setFilterCat]     = useState('')
  const [sortBy,        setSortBy]        = useState('status')


  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErr(null)
    try {
      const [bRes, cRes] = await Promise.all([budgetsAPI.getAll(user.id), categoriesAPI.getAll(user.id)])
      setBudgets(Array.isArray(bRes) ? bRes : (bRes?.data ?? bRes?.budgets ?? []))
      setCategories(Array.isArray(cRes) ? cRes : (cRes?.data ?? cRes?.categories ?? []))
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const handleSave = async data => {
    try {
      if (editItem) {
        await budgetsAPI.update(editItem.id, { user_id:user.id, ...data })
        success('Mis à jour')
      } else {
        await budgetsAPI.create({ user_id:user.id, ...data })
        success(data.budget_type==='saving_global' ? '🌍 Épargne globale créée !' : data.budget_type==='saving' ? '🏦 Épargne créée !' : '💸 Budget créé !')

      }
      setShowForm(false); setEditItem(null); load()
    } catch(e) { toastErr(e.message) }
  }

  const handleDelete = async () => {
    try {
      await budgetsAPI.delete(confirmDelete, user.id)
      success('Supprimé')
      setConfirmDelete(null); load()
    } catch(e) { toastErr(e.message) }
  }

  const openNew  = type => { setDefaultType(type); setEditItem(null); setShowForm(true) }
  const openEdit = item => { setEditItem(item); setDefaultType(item.budget_type ?? 'budget'); setShowForm(true) }

  const allBudgets      = useMemo(() => budgets.filter(b=>(b.budget_type??'budget')==='budget').map(b=>({...b,_status:getStatus(b)})), [budgets])
  const allSavings      = useMemo(() => budgets.filter(b=>b.budget_type==='saving').map(b=>({...b,_status:getStatus(b)})), [budgets])
  const allGlobalSaving = useMemo(() => budgets.filter(b=>b.budget_type==='saving_global').map(b=>({...b,_status:getStatus(b)})), [budgets])

  const currentList = mainTab==='budget' ? allBudgets : mainTab==='saving' ? allSavings : allGlobalSaving

  const filtered = useMemo(() => {
    const STATUS_ORDER = { over:0, warning:1, active:2, future:3, completed:4, saved:5, missed:6, idle:7 }
    let res = currentList.filter(b=>matchesTab(b,subTab))
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(b => {
        const cat = b.category&&typeof b.category==='object' ? b.category : categories.find(c=>String(c.id)===String(b.category_id))
        return (b.name??'').toLowerCase().includes(q) || cat?.name?.toLowerCase().includes(q) || (b.notes??'').toLowerCase().includes(q)
      })
    }
    if (filterCat) res = res.filter(b=>String(b.category_id)===filterCat||String(b.category?.id)===filterCat)
    switch(sortBy) {
      case 'status':     res.sort((a,b)=>(STATUS_ORDER[a._status.key]??9)-(STATUS_ORDER[b._status.key]??9)); break
      case 'end_date':   res.sort((a,b)=>(a.end_date??'').localeCompare(b.end_date??'')); break
      case 'pct_desc':   res.sort((a,b)=>{const pa=(a.limit_amount??0)>0?(a.spent_amount??0)/(a.limit_amount??1):0;const pb=(b.limit_amount??0)>0?(b.spent_amount??0)/(b.limit_amount??1):0;return pb-pa}); break
      case 'amount_desc':res.sort((a,b)=>(b.limit_amount??b.target_amount??0)-(a.limit_amount??a.target_amount??0)); break
      default: break
    }
    return res
  }, [currentList, subTab, search, filterCat, sortBy, categories])

  const kpis = useMemo(() => {
    const list = currentList
    const isSavingType = mainTab !== 'budget'
    return {
      total:    list.reduce((s,b)=>s+(isSavingType?(b.target_amount??0):(b.limit_amount??0)),0),
      spent:    list.reduce((s,b)=>s+(b.spent_amount??b.saved_amount??0),0),
      over:     list.filter(b=>b._status.key==='over').length,
      active:   list.filter(b=>['active','warning'].includes(b._status.key)).length,
      upcoming: list.filter(b=>b._status.key==='future').length,
      done:     list.filter(b=>['saved','completed','missed'].includes(b._status.key)).length,
    }
  }, [currentList, mainTab])

  const tabCounts = useMemo(() => ({
    all:      currentList.length,
    active:   currentList.filter(b=>matchesTab(b,'active')).length,
    upcoming: currentList.filter(b=>matchesTab(b,'upcoming')).length,
    exceeded: currentList.filter(b=>matchesTab(b,'exceeded')).length,
    done:     currentList.filter(b=>matchesTab(b,'done')).length,
  }), [currentList])

  const SUB_TABS = [
    { key:'all',      label:'Tous'     },
    { key:'active',   label:'En cours' },
    { key:'upcoming', label:'À venir'  },
    ...(mainTab==='budget' ? [{ key:'exceeded', label:'Dépassés' }] : []),
    { key:'done',     label:'Terminés' },
  ]

  const MAIN_TABS = [
    { key:'budget',        label:'💸 Budgets',        count:allBudgets.length,      color:'#7c6cfc' },
    { key:'saving',        label:'🏦 Épargnes',        count:allSavings.length,      color:'#22d3a0' },
    { key:'saving_global', label:'🌍 Épargne globale', count:allGlobalSaving.length, color:'#a78bfa' },
  ]

  return (
    <div className="fade-up" style={{ padding:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="page-title">Budgets & Épargne</div>
          <div className="page-subtitle">Gérez vos enveloppes et objectifs financiers</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:9, border:'1px solid var(--border)', overflow:'hidden' }}>
            {[['grid','⊞'],['list','≡']].map(([v,ic])=>(
              <button key={v} onClick={()=>setViewMode(v)} style={{ padding:'7px 12px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, background:viewMode===v?'rgba(124,108,252,.2)':'transparent', color:viewMode===v?'var(--accent2)':'var(--text3)', transition:'all .15s' }}>{ic}</button>
            ))}
          </div>
          {[
            { type:'budget',        label:'Budget',          bg:'linear-gradient(135deg,#7c6cfc,#5b4de8)', shadow:'rgba(124,108,252,.3)' },
            { type:'saving',        label:'Épargne',         bg:'linear-gradient(135deg,#22d3a0,#059669)', shadow:'rgba(34,211,160,.3)'  },
            { type:'saving_global', label:'Épargne globale', bg:'linear-gradient(135deg,#a78bfa,#7c3aed)', shadow:'rgba(167,139,250,.3)' },
          ].map(b=>(
            <button key={b.type} onClick={()=>openNew(b.type)} style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 12px', border:'none', borderRadius:10, background:b.bg, color:'white', fontFamily:'inherit', fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:`0 2px 12px ${b.shadow}`, transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${b.shadow.replace('.3','.45')}` }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=`0 2px 12px ${b.shadow}` }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display:'flex', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:4, marginBottom:20, gap:4 }}>
        {MAIN_TABS.map(tab=>(
          <button key={tab.key} onClick={()=>{ setMainTab(tab.key); setSubTab('active') }} style={{
            flex:1, padding:'10px 14px', border:'none', borderRadius:10, cursor:'pointer',
            fontFamily:'inherit', fontSize:13, fontWeight:700, transition:'all .2s',
            background: mainTab===tab.key ? `${tab.color}15` : 'transparent',
            color: mainTab===tab.key ? tab.color : 'var(--text2)',
            borderWidth:1, borderStyle:'solid', borderColor: mainTab===tab.key ? tab.color+'30' : 'transparent',
          }}>
            {tab.label}
            <span style={{ marginLeft:6, fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:100, background:'var(--surface2)', color:'var(--text3)' }}>{tab.count}</span>
          </button>
        ))}
      </div>
      {/* KPIs */}
      {!loading && currentList.length > 0 && (
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label: mainTab==='budget'?'Budget total':'Total objectifs', value:fmt(kpis.total),                   color:MAIN_TABS.find(t=>t.key===mainTab)?.color??'var(--accent2)' },
            { label: mainTab==='budget'?'Dépensé':'Épargné',              value:fmt(kpis.spent),                   color: mainTab==='budget'?'#f5476a':'#22d3a0' },
            { label:'Restant',    value:fmt(kpis.total-kpis.spent),        color:(kpis.total-kpis.spent)>=0?'#22d3a0':'#f5476a' },
            { label:'En cours',   value:String(kpis.active),               color:'#22d3a0' },
            ...(mainTab==='budget' ? [{ label:'Dépassés', value:String(kpis.over), color:'#f5476a' }] : [{ label:'À venir', value:String(kpis.upcoming), color:'#38bdf8' }]),
            { label:'Terminés',   value:String(kpis.done),                 color:'var(--text3)' },
          ].map((s,i)=>(
            <div key={i} className="card" style={{ flex:'1 1 90px', padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4, whiteSpace:'nowrap' }}>{s.label}</div>
              <div style={{ fontSize:17, fontWeight:800, color:s.color, letterSpacing:'-.02em' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs + filtres */}
      <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap', borderBottom:'1px solid var(--border)', paddingBottom:12 }}>
        {SUB_TABS.map(tab=>{
          const count   = tabCounts[tab.key]
          const active  = subTab===tab.key
          const accent  = MAIN_TABS.find(t=>t.key===mainTab)?.color ?? '#a78bfa'
          return (
            <button key={tab.key} onClick={()=>setSubTab(tab.key)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
              border:`1px solid ${active?accent+'44':'var(--border)'}`,
              borderRadius:100, cursor:'pointer', fontFamily:'inherit',
              fontSize:12, fontWeight:active?700:500, transition:'all .15s',
              background:active?`${accent}15`:'transparent', color:active?accent:'var(--text2)',
            }}>
              {tab.label}
              {count>0 && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:100, background:active?`${accent}25`:'var(--surface2)', color:active?accent:'var(--text3)' }}>{count}</span>}
            </button>
          )
        })}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative' }}>
            <svg width="12" height="12" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="input" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:28, width:150, fontSize:12 }}/>
          </div>
          {mainTab!=='saving_global' && (
            <select className="input" style={{ width:'auto', fontSize:12 }} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
              <option value="">Toutes catégories</option>
              {categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          )}
          <select className="input" style={{ width:'auto', fontSize:12 }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="status">Statut</option>
            <option value="end_date">Échéance</option>
            <option value="pct_desc">% utilisé ↓</option>
            <option value="amount_desc">Montant ↓</option>
          </select>
          {(search||filterCat) && <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch('');setFilterCat('')}}>✕</button>}
          <span style={{ fontSize:12, color:'var(--text3)', whiteSpace:'nowrap' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </div>
      </div>

      {err && <div className="error-box" style={{ marginBottom:16 }}>{err} <button className="btn btn-ghost btn-sm" style={{ marginLeft:8 }} onClick={load}>Réessayer</button></div>}

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:220, borderRadius:16 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:'60px 20px', textAlign:'center', color:'var(--text3)' }}>
          <div style={{ fontSize:44, marginBottom:14 }}>{search||filterCat?'🔍':mainTab==='saving_global'?'🌍':mainTab==='saving'?'🏦':'🎯'}</div>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:8, color:'var(--text2)' }}>
            {search||filterCat?'Aucun résultat':`Aucun${mainTab==='saving_global'?" objectif d'épargne globale":mainTab==='saving'?" objectif d'épargne":' budget'}`}
          </div>
          <div style={{ fontSize:13, marginBottom:22 }}>{search||filterCat?'Modifiez vos filtres.':'Créez votre première enveloppe.'}</div>
          {!search&&!filterCat && (
            <button onClick={()=>openNew(mainTab)} style={{
              padding:'10px 20px', border:'none', borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:14, color:'white',
              background: mainTab==='saving_global'?'linear-gradient(135deg,#a78bfa,#7c3aed)':mainTab==='saving'?'linear-gradient(135deg,#22d3a0,#059669)':'linear-gradient(135deg,#7c6cfc,#5b4de8)',
            }}>
              {mainTab==='saving_global'?"🌍 Créer une épargne globale":mainTab==='saving'?'🏦 Créer une épargne':'💸 Créer un budget'}
            </button>
          )}
        </div>
      ) : viewMode==='grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map((b,i) =>
            mainTab==='saving_global'
              ? <GlobalSavingCard key={b.id} b={b} onEdit={openEdit} onDelete={setConfirmDelete} idx={i}/>
              : mainTab==='saving'
                ? <SavingCard key={b.id} b={b} categories={categories} onEdit={openEdit} onDelete={setConfirmDelete} idx={i}/>
                : <BudgetCard key={b.id} b={b} categories={categories} onEdit={openEdit} onDelete={setConfirmDelete} idx={i}/>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>

                  {['Nom','Catégorie','Période',mainTab==='budget'?'Limite':'Objectif',mainTab==='budget'?'Dépensé':'Épargné','Progression','Échéance','Statut',''].map(h=>(
                    <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b,i)=>{
                  const catObj   = b.category&&typeof b.category==='object'?b.category:categories.find(c=>String(c.id)===String(b.category))
                  const catColor = catObj?.color ?? (mainTab==='budget'?'#7c6cfc':mainTab==='saving'?'#22d3a0':'#a78bfa')
                  const limit    = Math.max(Number(b.limit_amount)||0, Number(b.target_amount)||0)
                  const catName  = b.category
                  const spent    = b.spent_amount??b.saved_amount??0
                  const pct      = limit>0?Math.min((spent/limit)*100,100):0
                  const dl       = getDaysLeft(b.end_date)
                  return (
                    <tr key={b.id} className="table-row slide-right" style={{ animationDelay:`${i*.03}s` }}>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color:'var(--text)' }}>{b.name||catObj?.name||`#${b.id}`}</td>
                      <td style={{ padding:'11px 14px' }}>
                        {mainTab==='saving_global' ? (
                          <span style={{ fontSize:11, color:'#a78bfa', fontWeight:600 }}>Tous revenus{b.savings_pct?` · ${b.savings_pct}%`:''}</span>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:catColor, display:'inline-block' }}/>
                            <span style={{ fontSize:12, color:'var(--text2)' }}>{catName??'—'}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text3)', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>
                        {b.start_date?`${fmtD(b.start_date)} → ${fmtD(b.end_date)}`:'—'}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(limit)}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:mainTab==='budget'&&spent>limit?'#f5476a':mainTab!=='budget'?'#22d3a0':'var(--text)' }}>{fmt(spent)}</td>
                      <td style={{ padding:'11px 14px', minWidth:120 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="progress" style={{ height:5, flex:1 }}>
                            <div className="progress-fill" style={{ width:`${pct}%`, height:'100%', background:mainTab==='budget'&&spent>limit?'#f5476a':mainTab==='saving_global'?'linear-gradient(90deg,#a78bfa,#c4b5fd)':mainTab==='saving'?'linear-gradient(90deg,#22d3a0,#34d399)':`linear-gradient(90deg,${catColor},${catColor}88)` }}/>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', minWidth:28 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:dl!==null&&dl<=3?'#f59e0b':'var(--text3)', fontWeight:dl!==null&&dl<=3?600:400 }}>
                        {dl===null?'—':dl<=0?'Terminé':`${dl}j`}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:b._status.bg, color:b._status.color }}>{b._status.icon} {b._status.label}</span>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding:'5px 8px' }} onClick={()=>openEdit(b)}>✏</button>
                          <button className="btn btn-danger btn-sm" style={{ padding:'5px 8px' }} onClick={()=>setConfirmDelete(b.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showForm||editItem) && (
        <BudgetForm categories={categories} initial={editItem} defaultType={defaultType} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditItem(null)}}/>
      )}
      {confirmDelete && <ConfirmModal onConfirm={handleDelete} onCancel={()=>setConfirmDelete(null)}/>}
    </div>
  )
}