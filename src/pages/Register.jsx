import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// ── Animated orbs ─────────────────────────────────────────────────────────────
function GradientOrbs() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', top:'-180px', right:'-150px', background:'radial-gradient(circle, rgba(34,211,160,.1) 0%, transparent 70%)', animation:'orbPulse 9s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', bottom:'-150px', left:'-100px', background:'radial-gradient(circle, rgba(124,108,252,.1) 0%, transparent 70%)', animation:'orbPulse 11s ease-in-out 1.5s infinite reverse' }}/>
      <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', top:'35%', left:'10%', background:'radial-gradient(circle, rgba(56,189,248,.06) 0%, transparent 70%)', animation:'orbPulse 7s ease-in-out 3s infinite' }}/>
      <style>{`@keyframes orbPulse { 0%,100%{transform:scale(1) translate(0,0);}50%{transform:scale(1.12) translate(18px,-12px);}}`}</style>
    </div>
  )
}

// ── Floating particles ────────────────────────────────────────────────────────
function ParticleField() {
  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      {[...Array(16)].map((_,i) => (
        <div key={i} style={{
          position:'absolute',
          width: 2 + (i%3), height: 2 + (i%3),
          borderRadius:'50%',
          background: i%4===0?'rgba(34,211,160,.5)':i%4===1?'rgba(124,108,252,.4)':i%4===2?'rgba(56,189,248,.35)':'rgba(167,139,250,.4)',
          left:`${8+(i*19)%88}%`, top:`${5+(i*27)%85}%`,
          animation:`floatP ${5+(i%5)*2.2}s ease-in-out ${(i*0.5)%5}s infinite alternate`,
        }}/>
      ))}
      <style>{`@keyframes floatP{from{transform:translateY(0) translateX(0) scale(1);opacity:.35;}to{transform:translateY(-24px) translateX(12px) scale(1.5);opacity:.85;}}`}</style>
    </div>
  )
}

// ── OTP input ─────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled, hasError }) {
  const digits = 6
  const refs = useRef([])
  const arr = value.split('').concat(Array(digits).fill('')).slice(0, digits)

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = arr.slice(); next[i] = ''
      onChange(next.join(''))
      if (i > 0) refs.current[i-1]?.focus()
    }
  }
  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g,'').slice(-1)
    const next = arr.slice(); next[i] = char
    onChange(next.join(''))
    if (char && i < digits-1) refs.current[i+1]?.focus()
  }
  const handlePaste = e => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,digits)
    onChange(pasted.padEnd(digits,'').slice(0,digits))
    refs.current[Math.min(pasted.length, digits-1)]?.focus()
    e.preventDefault()
  }

  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center', margin:'28px 0 20px' }}>
      {arr.map((d,i) => (
        <div key={i} style={{ position:'relative' }}>
          <input
            ref={el => refs.current[i] = el}
            type="text" inputMode="numeric" maxLength={1} value={d}
            disabled={disabled}
            onChange={e => handleChange(i,e)}
            onKeyDown={e => handleKey(i,e)}
            onPaste={handlePaste}
            style={{
              width:46, height:56, textAlign:'center',
              fontSize:24, fontWeight:800,
              fontFamily:"'JetBrains Mono', monospace",
              background: hasError ? 'rgba(245,71,106,.08)' : d ? 'rgba(34,211,160,.1)' : 'rgba(255,255,255,.03)',
              border:`2px solid ${hasError ? 'rgba(245,71,106,.5)' : d ? 'rgba(34,211,160,.6)' : 'rgba(255,255,255,.08)'}`,
              borderRadius:14, color:'#e8f0ff', outline:'none',
              transition:'all .18s cubic-bezier(.34,1.56,.64,1)',
              cursor: disabled ? 'not-allowed' : 'text',
              boxShadow: d ? '0 0 0 4px rgba(34,211,160,.07)' : 'none',
              transform: d ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          <div style={{
            position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)',
            width: d ? '70%' : '0%', height:2, borderRadius:1,
            background:'linear-gradient(90deg,#22d3a0,#34d399)',
            transition:'width .25s cubic-bezier(.34,1.56,.64,1)',
          }}/>
        </div>
      ))}
    </div>
  )
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    const id = setInterval(() => setLeft(s => {
      if (s <= 1) { clearInterval(id); onExpire(); return 0 }
      return s-1
    }), 1000)
    return () => clearInterval(id)
  }, [seconds])
  const m = String(Math.floor(left/60)).padStart(2,'0')
  const s = String(left%60).padStart(2,'0')
  const pct = (left/seconds)*100

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative', width:52, height:52 }}>
        <svg width="52" height="52" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="3"/>
          <circle cx="26" cy="26" r="22" fill="none"
            stroke={left < 30 ? '#f5476a' : '#22d3a0'}
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*22}`}
            strokeDashoffset={`${2*Math.PI*22*(1-pct/100)}`}
            style={{ transition:'stroke-dashoffset .9s linear, stroke .5s' }}
          />
        </svg>
        <span style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:700,
          color: left < 30 ? '#f5476a' : '#22d3a0',
        }}>{m}:{s}</span>
      </div>
      <span style={{ fontSize:12, color:'rgba(255,255,255,.3)' }}>
        {left < 30 ? '⚠ Code bientôt expiré' : 'avant expiration'}
      </span>
    </div>
  )
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:28 }}>
      {[...Array(total)].map((_,i) => (
        <div key={i} style={{
          height:4, borderRadius:2,
          width: i===current ? 24 : 8,
          background: i===current ? '#22d3a0' : i<current ? 'rgba(34,211,160,.4)' : 'rgba(255,255,255,.1)',
          transition:'all .35s cubic-bezier(.34,1.56,.64,1)',
        }}/>
      ))}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }}/>
      <span style={{ fontSize:11, color:'rgba(255,255,255,.2)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</span>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }}/>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, icon, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:7 }}>{label}</label>
      <div style={{ position:'relative' }}>
        {icon && (
          <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none', opacity: focused ? 1 : .35, transition:'opacity .2s' }}>
            {icon}
          </span>
        )}
        <input
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={{
            width:'100%', padding:`11px 14px 11px ${icon ? '38px' : '14px'}`,
            background: focused ? 'rgba(34,211,160,.05)' : 'rgba(255,255,255,.03)',
            border:`1.5px solid ${focused ? 'rgba(34,211,160,.5)' : 'rgba(255,255,255,.08)'}`,
            borderRadius:12, fontSize:14,
            fontFamily:"'Plus Jakarta Sans', sans-serif",
            color:'#e8f0ff', outline:'none',
            transition:'all .2s ease',
            boxShadow: focused ? '0 0 0 4px rgba(34,211,160,.08)' : 'none',
          }}
        />
      </div>
    </div>
  )
}

// ── Password strength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['Très faible','Faible','Moyen','Fort','Très fort']
  const colors = ['#f5476a','#f87171','#f59e0b','#22d3a0','#22d3a0']

  return (
    <div style={{ marginTop:8, marginBottom:4 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex:1, height:3, borderRadius:2,
            background: i <= score ? colors[score] : 'rgba(255,255,255,.08)',
            transition:'background .3s',
          }}/>
        ))}
      </div>
      <span style={{ fontSize:11, color: colors[score], fontWeight:600 }}>{labels[score]}</span>
    </div>
  )
}

// ── Main Register ─────────────────────────────────────────────────────────────
export default function Register() {
  const { sendRegisterOtp, register } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [step,      setStep]     = useState('form')
  const [form,      setForm]     = useState({ name:'', email:'', password:'', password_confirmation:'' })
  const [otp,       setOtp]      = useState('')
  const [loading,   setLoading]  = useState(false)
  const [err,       setErr]      = useState('')
  const [expired,   setExpired]  = useState(false)
  const [resending, setResending]= useState(false)
  const [otpError,  setOtpError] = useState(false)

  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const handleFormSubmit = async e => {
    e.preventDefault()
    if (!form.name||!form.email||!form.password) { setErr('Remplissez tous les champs'); return }
    if (form.password.length < 6) { setErr('Mot de passe : 6 caractères minimum'); return }
    if (form.password !== form.password_confirmation) { setErr('Les mots de passe ne correspondent pas'); return }
    setErr(''); setLoading(true)
    try {
      await sendRegisterOtp(form.email, form.name)
      setStep('otp'); setExpired(false)
    } catch(e) { setErr(e.message); toastError('Impossible d\'envoyer le code') }
    finally { setLoading(false) }
  }

  const handleOtpSubmit = async e => {
    e.preventDefault()
    if (otp.length < 6) { setErr('Entrez le code à 6 chiffres'); setOtpError(true); return }
    setErr(''); setOtpError(false); setLoading(true)
    try {
      await register({ ...form, otp })
      success('Compte créé ! Bienvenue 🎉')
      navigate('/login')
    } catch(e) {
      setErr(e.message); setOtpError(true)
      toastError('Code invalide')
    }
    finally { setLoading(false) }
  }

  const handleResend = async () => {
    setResending(true); setErr(''); setOtpError(false)
    try {
      await sendRegisterOtp(form.email, form.name)
      setOtp(''); setExpired(false)
      success('Nouveau code envoyé !')
    } catch { toastError('Impossible de renvoyer') }
    finally { setResending(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080810', position:'relative', padding:16 }}>
      <GradientOrbs/>
      <ParticleField/>

      <div className="fade-up" style={{
        position:'relative', zIndex:1,
        width:440, maxWidth:'100%',
        background:'rgba(17,17,28,.88)',
        backdropFilter:'blur(24px)',
        border:'1px solid rgba(255,255,255,.07)',
        borderRadius:28,
        padding:'36px 36px 32px',
        boxShadow:'0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(34,211,160,.06) inset',
      }}>

        {/* Ligne lumineuse verte */}
        <div style={{
          position:'absolute', top:0, left:'20%', right:'20%', height:1,
          background:'linear-gradient(90deg, transparent, rgba(34,211,160,.5), rgba(52,211,153,.3), transparent)',
          borderRadius:1,
        }}/>

        {/* ── STEP : FORM ──────────────────────────────── */}
        {step === 'form' && (
          <div style={{ animation:'fadeSlideUp .3s ease forwards' }}>
            <StepDots current={0} total={2}/>

            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{
                width:56, height:56, borderRadius:18, margin:'0 auto 16px',
                background:'linear-gradient(135deg,#22d3a0,#059669)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 28px rgba(34,211,160,.4)',
                position:'relative',
              }}>
                <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <div style={{ position:'absolute', inset:-8, borderRadius:26, background:'rgba(34,211,160,.07)', zIndex:-1 }}/>
              </div>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', margin:'0 0 6px' }}>
                Créer un compte
              </h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.3)', margin:0 }}>Rejoignez SmartFinance</p>
            </div>

            <form onSubmit={handleFormSubmit}>
              {err && (
                <div style={{
                  padding:'10px 14px', borderRadius:10, marginBottom:16, fontSize:13,
                  background:'rgba(245,71,106,.08)', border:'1px solid rgba(245,71,106,.2)',
                  color:'#f87171', display:'flex', alignItems:'center', gap:8,
                  animation:'shake .35s ease',
                }}>
                  <span>⚠</span> {err}
                </div>
              )}

              <Field label="Nom complet" icon="👤" type="text" placeholder="Jean Dupont"
                value={form.name} onChange={e=>set('name',e.target.value)} autoComplete="name"/>
              <Field label="Email" icon="✉" type="email" placeholder="vous@exemple.com"
                value={form.email} onChange={e=>set('email',e.target.value)} autoComplete="email"/>

              <div style={{ marginBottom:4 }}>
                <Field label="Mot de passe" icon="🔒" type="password" placeholder="6 caractères minimum"
                  value={form.password} onChange={e=>set('password',e.target.value)} autoComplete="new-password"/>
                <PasswordStrength password={form.password}/>
              </div>

              <div style={{ marginBottom:20 }}>
                <Field label="Confirmer" icon="🔑" type="password" placeholder="Répétez le mot de passe"
                  value={form.password_confirmation} onChange={e=>set('password_confirmation',e.target.value)} autoComplete="new-password"/>
                {form.password_confirmation && form.password !== form.password_confirmation && (
                  <span style={{ fontSize:11, color:'#f87171', fontWeight:600 }}>✕ Ne correspond pas</span>
                )}
                {form.password_confirmation && form.password === form.password_confirmation && form.password.length >= 6 && (
                  <span style={{ fontSize:11, color:'#22d3a0', fontWeight:600 }}>✓ Correspond</span>
                )}
              </div>

              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'13px',
                background: loading ? 'rgba(34,211,160,.3)' : 'linear-gradient(135deg,#22d3a0,#059669)',
                border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(34,211,160,.35)',
                transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(34,211,160,.5)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(34,211,160,.35)' }}
              >
                {loading ? <><span className="spinner"/> Envoi du code…</> : <>Continuer <span>→</span></>}
              </button>
            </form>

            <Divider label="déjà inscrit"/>
            <div style={{ textAlign:'center', fontSize:14, color:'rgba(255,255,255,.3)' }}>
              Vous avez déjà un compte ?{' '}
              <Link to="/login" style={{ color:'#34d399', fontWeight:700, textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.color='#6ee7b7'}
                onMouseLeave={e=>e.currentTarget.style.color='#34d399'}>
                Se connecter
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP : OTP ───────────────────────────────── */}
        {step === 'otp' && (
          <div style={{ animation:'fadeSlideUp .3s ease forwards' }}>
            <StepDots current={1} total={2}/>

            <div style={{ textAlign:'center', marginBottom:8 }}>
              <button onClick={()=>{ setStep('form'); setOtp(''); setErr(''); setOtpError(false) }} style={{
                background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)',
                borderRadius:8, color:'rgba(255,255,255,.35)', cursor:'pointer', fontSize:12, fontWeight:600,
                padding:'5px 12px', marginBottom:20, transition:'all .15s', fontFamily:'inherit',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.color='rgba(255,255,255,.7)'; e.currentTarget.style.borderColor='rgba(255,255,255,.14)' }}
              onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,.35)'; e.currentTarget.style.borderColor='rgba(255,255,255,.07)' }}
              >
                ← Retour
              </button>

              <div style={{
                width:64, height:64, borderRadius:20, margin:'0 auto 16px',
                background:'rgba(34,211,160,.1)', border:'1.5px solid rgba(34,211,160,.25)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
                animation:'iconBounce .5s cubic-bezier(.34,1.56,.64,1)',
              }}>
                🛡️
              </div>

              <h1 style={{ fontSize:20, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.03em', marginBottom:8 }}>
                Vérifiez votre email
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.35)', lineHeight:1.7, margin:0 }}>
                Code envoyé à<br/>
                <strong style={{ color:'#34d399', fontWeight:700 }}>{form.email}</strong>
              </p>
            </div>

            <form onSubmit={handleOtpSubmit}>
              {err && (
                <div style={{
                  padding:'9px 14px', borderRadius:10, marginBottom:4, fontSize:13,
                  background:'rgba(245,71,106,.08)', border:'1px solid rgba(245,71,106,.2)',
                  color:'#f87171', display:'flex', alignItems:'center', gap:8,
                  animation:'shake .35s ease',
                }}>
                  <span>⚠</span> {err}
                </div>
              )}

              <OtpInput value={otp} onChange={v=>{ setOtp(v); setOtpError(false) }} disabled={loading||expired} hasError={otpError}/>

              <div style={{ textAlign:'center', marginBottom:24 }}>
                {expired
                  ? <span style={{ color:'#f87171', fontSize:13, fontWeight:600 }}>⏱ Code expiré</span>
                  : <Countdown seconds={300} onExpire={()=>setExpired(true)}/>
                }
              </div>

              <button type="submit" disabled={loading||expired||otp.length<6} style={{
                width:'100%', padding:'13px', marginBottom:10,
                background: (loading||expired||otp.length<6) ? 'rgba(34,211,160,.2)' : 'linear-gradient(135deg,#22d3a0,#059669)',
                border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                cursor: (loading||expired||otp.length<6) ? 'not-allowed' : 'pointer',
                boxShadow: (loading||expired||otp.length<6) ? 'none' : '0 4px 20px rgba(34,211,160,.35)',
                transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e=>{ if(!loading&&!expired&&otp.length>=6){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(34,211,160,.5)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(34,211,160,.35)' }}
              >
                {loading ? <><span className="spinner"/> Vérification…</> : 'Créer mon compte'}
              </button>

              <button type="button" onClick={handleResend} disabled={resending} style={{
                width:'100%', padding:'12px',
                background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)',
                borderRadius:14, color:'rgba(255,255,255,.3)', cursor: resending ? 'not-allowed' : 'pointer',
                fontSize:13, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif",
                opacity: resending ? 0.6 : 1, transition:'all .2s',
              }}
              onMouseEnter={e=>{ if(!resending){ e.currentTarget.style.borderColor='rgba(255,255,255,.14)'; e.currentTarget.style.color='rgba(255,255,255,.6)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; e.currentTarget.style.color='rgba(255,255,255,.3)' }}
              >
                {resending ? '↻ Envoi en cours…' : '↺ Renvoyer le code'}
              </button>
            </form>
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'rgba(255,255,255,.12)', letterSpacing:'.02em' }}>
          Protégé · SmartFinance © {new Date().getFullYear()}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shake { 0%,100%{transform:translateX(0);}20%{transform:translateX(-6px);}40%{transform:translateX(6px);}60%{transform:translateX(-4px);}80%{transform:translateX(4px);} }
        @keyframes iconBounce { from{transform:scale(.6);opacity:0;}to{transform:scale(1);opacity:1;} }
      `}</style>
    </div>
  )
}
