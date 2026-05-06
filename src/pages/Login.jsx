import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// ── Floating particles background ─────────────────────────────────────────────
function ParticleField() {
  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      {[...Array(18)].map((_,i) => (
        <div key={i} style={{
          position:'absolute',
          width: 2 + (i%3),
          height: 2 + (i%3),
          borderRadius:'50%',
          background: i%3===0 ? 'rgba(124,108,252,.5)' : i%3===1 ? 'rgba(34,211,160,.35)' : 'rgba(56,189,248,.35)',
          left: `${5 + (i*17)%90}%`,
          top: `${10 + (i*23)%80}%`,
          animation: `float ${6 + (i%5)*2}s ease-in-out ${(i*0.4)%4}s infinite alternate`,
        }}/>
      ))}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) translateX(0px) scale(1); opacity:.4; }
          to   { transform: translateY(-28px) translateX(14px) scale(1.4); opacity:.9; }
        }
      `}</style>
    </div>
  )
}

// ── Animated gradient orbs ─────────────────────────────────────────────────────
function GradientOrbs() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{
        position:'absolute', width:600, height:600,
        borderRadius:'50%', top:'-180px', left:'-120px',
        background:'radial-gradient(circle, rgba(124,108,252,.12) 0%, transparent 70%)',
        animation:'orbPulse 8s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', width:500, height:500,
        borderRadius:'50%', bottom:'-150px', right:'-100px',
        background:'radial-gradient(circle, rgba(34,211,160,.08) 0%, transparent 70%)',
        animation:'orbPulse 10s ease-in-out 2s infinite reverse',
      }}/>
      <div style={{
        position:'absolute', width:300, height:300,
        borderRadius:'50%', top:'40%', right:'15%',
        background:'radial-gradient(circle, rgba(56,189,248,.07) 0%, transparent 70%)',
        animation:'orbPulse 7s ease-in-out 1s infinite',
      }}/>
      <style>{`
        @keyframes orbPulse {
          0%,100% { transform: scale(1) translate(0,0); }
          50%      { transform: scale(1.15) translate(20px,-15px); }
        }
      `}</style>
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
              background: hasError ? 'rgba(245,71,106,.08)' : d ? 'rgba(124,108,252,.12)' : 'rgba(255,255,255,.03)',
              border: `2px solid ${hasError ? 'rgba(245,71,106,.5)' : d ? 'rgba(124,108,252,.7)' : 'rgba(255,255,255,.08)'}`,
              borderRadius:14, color:'#e8f0ff', outline:'none',
              transition:'all .18s cubic-bezier(.34,1.56,.64,1)',
              cursor: disabled ? 'not-allowed' : 'text',
              boxShadow: d ? '0 0 0 4px rgba(124,108,252,.08)' : 'none',
              transform: d ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          {/* Underline accent */}
          <div style={{
            position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)',
            width: d ? '70%' : '0%', height:2, borderRadius:1,
            background:'linear-gradient(90deg,#7c6cfc,#a78bfa)',
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
            stroke={left < 30 ? '#f5476a' : '#7c6cfc'}
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*22}`}
            strokeDashoffset={`${2*Math.PI*22*(1-pct/100)}`}
            style={{ transition:'stroke-dashoffset .9s linear, stroke .5s' }}
          />
        </svg>
        <span style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:700,
          color: left < 30 ? '#f5476a' : '#a78bfa',
        }}>{m}:{s}</span>
      </div>
      <span style={{ fontSize:12, color:'var(--text3)' }}>
        {left < 30 ? '⚠ Code bientôt expiré' : 'avant expiration'}
      </span>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }}/>
      <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</span>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,.06)' }}/>
    </div>
  )
}

// ── Champ input stylisé ───────────────────────────────────────────────────────
function Field({ label, icon, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:7 }}>{label}</label>
      <div style={{ position:'relative' }}>
        {icon && (
          <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none', opacity: focused ? 1 : .45, transition:'opacity .2s' }}>
            {icon}
          </span>
        )}
        <input
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={{
            width:'100%', padding:`11px 14px 11px ${icon ? '38px' : '14px'}`,
            background: focused ? 'rgba(124,108,252,.06)' : 'rgba(255,255,255,.03)',
            border:`1.5px solid ${focused ? 'rgba(124,108,252,.6)' : 'rgba(255,255,255,.08)'}`,
            borderRadius:12, fontSize:14,
            fontFamily:"'Plus Jakarta Sans', sans-serif",
            color:'#e8f0ff', outline:'none',
            transition:'all .2s ease',
            boxShadow: focused ? '0 0 0 4px rgba(124,108,252,.1)' : 'none',
          }}
        />
      </div>
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:28 }}>
      {[...Array(total)].map((_,i) => (
        <div key={i} style={{
          height:4, borderRadius:2,
          width: i===current ? 24 : 8,
          background: i===current ? '#7c6cfc' : i<current ? 'rgba(124,108,252,.4)' : 'rgba(255,255,255,.1)',
          transition:'all .35s cubic-bezier(.34,1.56,.64,1)',
        }}/>
      ))}
    </div>
  )
}

// ── Main Login ─────────────────────────────────────────────────────────────────
export default function Login() {
  const { sendLoginOtp, login } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [step,      setStep]     = useState('form')
  const [form,      setForm]     = useState({ email:'', password:'' })
  const [otp,       setOtp]      = useState('')
  const [loading,   setLoading]  = useState(false)
  const [err,       setErr]      = useState('')
  const [expired,   setExpired]  = useState(false)
  const [resending, setResending]= useState(false)
  const [otpError,  setOtpError] = useState(false)

  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const handleFormSubmit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) { setErr('Remplissez tous les champs'); return }
    setErr(''); setLoading(true)
    try {
      await sendLoginOtp(form.email, form.password)
      setStep('otp'); setExpired(false)
    } catch(e) { setErr(e.message); toastError('Connexion échouée') }
    finally { setLoading(false) }
  }

  const handleOtpSubmit = async e => {
    e.preventDefault()
    if (otp.length < 6) { setErr('Entrez le code à 6 chiffres'); setOtpError(true); return }
    setErr(''); setOtpError(false); setLoading(true)
    try {
      await login(form.email, form.password, otp)
      success('Bienvenue !')
      navigate('/dashboard')
    } catch(e) {
      setErr(e.message); setOtpError(true)
      toastError('Code invalide')
    }
    finally { setLoading(false) }
  }

  const handleResend = async () => {
    setResending(true); setErr(''); setOtpError(false)
    try {
      await sendLoginOtp(form.email, form.password)
      setOtp(''); setExpired(false)
      success('Nouveau code envoyé !')
    } catch { toastError('Impossible de renvoyer') }
    finally { setResending(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080810', position:'relative', padding:16 }}>
      <GradientOrbs/>
      <ParticleField/>

      {/* Card */}
      <div className="fade-up" style={{
        position:'relative', zIndex:1,
        width:420, maxWidth:'100%',
        background:'rgba(17,17,28,.85)',
        backdropFilter:'blur(24px)',
        border:'1px solid rgba(255,255,255,.08)',
        borderRadius:28,
        padding:'36px 36px 32px',
        boxShadow:'0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(124,108,252,.08) inset',
      }}>

        {/* Ligne lumineuse en haut */}
        <div style={{
          position:'absolute', top:0, left:'20%', right:'20%', height:1,
          background:'linear-gradient(90deg, transparent, rgba(124,108,252,.6), rgba(167,139,250,.4), transparent)',
          borderRadius:1,
        }}/>

        {/* ── STEP : FORM ─────────────────────────────────────── */}
        {step === 'form' && (
          <div style={{ animation:'fadeSlideUp .3s ease forwards' }}>
            <StepDots current={0} total={2}/>

            {/* Logo + titre */}
            <div style={{ textAlign:'center', marginBottom:30 }}>
              <div style={{
                width:56, height:56, borderRadius:18, margin:'0 auto 16px',
                background:'linear-gradient(135deg,#7c6cfc,#5b4de8)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 28px rgba(124,108,252,.45)',
                position:'relative',
              }}>
                <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
                {/* Halo */}
                <div style={{ position:'absolute', inset:-8, borderRadius:26, background:'rgba(124,108,252,.08)', zIndex:-1 }}/>
              </div>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.04em', margin:'0 0 6px' }}>
                Bon retour 👋
              </h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.35)', margin:0 }}>Connectez-vous à SmartFinance</p>
            </div>

            <form onSubmit={handleFormSubmit}>
              {err && (
                <div style={{
                  padding:'10px 14px', borderRadius:10, marginBottom:16, fontSize:13,
                  background:'rgba(245,71,106,.08)', border:'1px solid rgba(245,71,106,.2)',
                  color:'#f87171', display:'flex', alignItems:'center', gap:8,
                  animation:'shake .35s ease',
                }}>
                  <span style={{ fontSize:15 }}>⚠</span> {err}
                </div>
              )}
              <Field label="Email" icon="✉" type="email" placeholder="vous@exemple.com"
                value={form.email} onChange={e=>set('email',e.target.value)} autoComplete="email"/>
              <Field label="Mot de passe" icon="🔒" type="password" placeholder="••••••••"
                value={form.password} onChange={e=>set('password',e.target.value)} autoComplete="current-password"/>

              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'13px', marginTop:4,
                background: loading ? 'rgba(124,108,252,.4)' : 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
                border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(124,108,252,.4)',
                transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(124,108,252,.55)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(124,108,252,.4)' }}
              >
                {loading ? <><span className="spinner"/> Envoi du code…</> : <>Continuer <span>→</span></>}
              </button>
            </form>

            <Divider label="nouveau ici"/>
            <div style={{ textAlign:'center', fontSize:14, color:'rgba(255,255,255,.3)' }}>
              Pas encore de compte ?{' '}
              <Link to="/register" style={{ color:'#a78bfa', fontWeight:700, textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.color='#c4b5fd'}
                onMouseLeave={e=>e.currentTarget.style.color='#a78bfa'}>
                Créer un compte
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP : OTP ──────────────────────────────────────── */}
        {step === 'otp' && (
          <div style={{ animation:'fadeSlideUp .3s ease forwards' }}>
            <StepDots current={1} total={2}/>

            <div style={{ textAlign:'center', marginBottom:8 }}>
              <button onClick={()=>{ setStep('form'); setOtp(''); setErr(''); setOtpError(false) }} style={{
                background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
                borderRadius:8, color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:12, fontWeight:600,
                padding:'5px 12px', marginBottom:20, transition:'all .15s', fontFamily:'inherit',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.color='rgba(255,255,255,.7)'; e.currentTarget.style.borderColor='rgba(255,255,255,.15)' }}
              onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,.4)'; e.currentTarget.style.borderColor='rgba(255,255,255,.08)' }}
              >
                ← Retour
              </button>

              {/* Icône animée */}
              <div style={{
                width:64, height:64, borderRadius:20, margin:'0 auto 16px',
                background:'rgba(124,108,252,.1)', border:'1.5px solid rgba(124,108,252,.25)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
                animation:'iconBounce .5s cubic-bezier(.34,1.56,.64,1)',
              }}>
                🔑
              </div>

              <h1 style={{ fontSize:20, fontWeight:800, color:'#f0f0ff', letterSpacing:'-.03em', marginBottom:8 }}>
                Vérification
              </h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.35)', lineHeight:1.7, margin:0 }}>
                Code envoyé à<br/>
                <strong style={{ color:'#a78bfa', fontWeight:700 }}>{form.email}</strong>
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
                background: (loading||expired||otp.length<6) ? 'rgba(124,108,252,.25)' : 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
                border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                cursor: (loading||expired||otp.length<6) ? 'not-allowed' : 'pointer',
                boxShadow: (loading||expired||otp.length<6) ? 'none' : '0 4px 20px rgba(124,108,252,.4)',
                transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e=>{ if(!loading&&!expired&&otp.length>=6){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(124,108,252,.55)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(124,108,252,.4)' }}
              >
                {loading ? <><span className="spinner"/> Vérification…</> : 'Se connecter'}
              </button>

              <button type="button" onClick={handleResend} disabled={resending||(!expired&&otp.length>0)} style={{
                width:'100%', padding:'12px',
                background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)',
                borderRadius:14, color:'rgba(255,255,255,.35)', cursor: resending ? 'not-allowed' : 'pointer',
                fontSize:13, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif",
                opacity: resending ? 0.6 : 1, transition:'all .2s',
              }}
              onMouseEnter={e=>{ if(!resending){ e.currentTarget.style.borderColor='rgba(255,255,255,.15)'; e.currentTarget.style.color='rgba(255,255,255,.6)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.color='rgba(255,255,255,.35)' }}
              >
                {resending ? '↻ Envoi en cours…' : '↺ Renvoyer le code'}
              </button>
            </form>
          </div>
        )}

        {/* Pied de carte */}
        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'rgba(255,255,255,.15)', letterSpacing:'.02em' }}>
          Protégé · SmartFinance © {new Date().getFullYear()}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%     { transform:translateX(-6px); }
          40%     { transform:translateX(6px); }
          60%     { transform:translateX(-4px); }
          80%     { transform:translateX(4px); }
        }
        @keyframes iconBounce {
          from { transform:scale(.6); opacity:0; }
          to   { transform:scale(1); opacity:1; }
        }
      `}</style>
    </div>
  )
}
