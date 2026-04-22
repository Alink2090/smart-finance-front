import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function OtpInput({ value, onChange, disabled }) {
  const digits = 6
  const refs = useRef([])
  const arr = value.split('').concat(Array(digits).fill('')).slice(0, digits)

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = arr.slice(); next[i] = ''
      onChange(next.join(''))
      if (i > 0) refs.current[i - 1]?.focus()
    }
  }
  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = arr.slice(); next[i] = char
    onChange(next.join(''))
    if (char && i < digits - 1) refs.current[i + 1]?.focus()
  }
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, digits)
    onChange(pasted.padEnd(digits, '').slice(0, digits))
    refs.current[Math.min(pasted.length, digits - 1)]?.focus()
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '24px 0' }}>
      {arr.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1} value={d} disabled={disabled}
          onChange={e => handleChange(i, e)} onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          style={{
            width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
            background: d ? 'rgba(124,108,252,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${d ? 'rgba(124,108,252,0.6)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, color: '#e8f0ff', outline: 'none', transition: 'all .15s',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
      ))}
    </div>
  )
}

function Countdown({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    setLeft(seconds)
    const id = setInterval(() => setLeft(s => {
      if (s <= 1) { clearInterval(id); onExpire(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(id)
  }, [seconds])
  const m = String(Math.floor(left / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: left < 30 ? '#f87171' : '#7c6cfc' }}>
      {m}:{s}
    </span>
  )
}

function Logo() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
      background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 24px rgba(124,108,252,.4)'
    }}>
      <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    </div>
  )
}

export default function Register() {
  // ✅ Fix 1 — destructurer sendRegisterOtp ET register depuis useAuth
  const { sendRegisterOtp, register } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [step, setStep]           = useState('form')
  const [form, setForm]           = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [otp, setOtp]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [expired, setExpired]     = useState(false)
  const [resending, setResending] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Step 1 — valide formulaire → envoie OTP
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setErr('Please fill all fields'); return }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters'); return }
    if (form.password !== form.password_confirmation) { setErr('Passwords do not match'); return }
    setErr('')
    setLoading(true)
    try {
      // ✅ Fix 2 — sendRegisterOtp du context, pas authAPI directement
      await sendRegisterOtp(form.email, form.name)
      setStep('otp')
      setExpired(false)
    } catch (e) {
      setErr(e.message)
      toastError('Could not send verification code')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — vérifie OTP → crée le compte
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (otp.length < 6) { setErr('Enter the 6-digit code'); return }
    setErr('')
    setLoading(true)
    try {
      // ✅ register reçoit { name, email, password, otp }
      await register({ ...form, otp })
      success('Account created! Welcome aboard 🎉')
      navigate('/login')
    } catch (e) {
      setErr(e.message)
      toastError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true); setErr('')
    try {
      // ✅ Fix 3 — resend aussi via le context
      await sendRegisterOtp(form.email, form.name)
      setOtp(''); setExpired(false)
      success('New code sent!')
    } catch {
      toastError('Could not resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card fade-up">

        {step === 'form' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Logo />
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em', marginBottom: 4 }}>
                Create your account
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text2)' }}>Start managing your finances</p>
            </div>

            <form onSubmit={handleFormSubmit}>
              {err && <div className="error-box" style={{ marginBottom: 16 }}>{err}</div>}
              <div style={{ marginBottom: 14 }}>
                <label className="input-label">Full Name</label>
                <input className="input" type="text" placeholder="John Doe"
                  value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="input-label">Email</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="input-label">Password</label>
                <input className="input" type="password" placeholder="Min. 6 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="input-label">Confirm Password</label>
                <input className="input" type="password" placeholder="Repeat password"
                  value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                {loading ? <><span className="spinner" /> Sending code…</> : 'Continue →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text2)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent2)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <button onClick={() => { setStep('form'); setOtp(''); setErr('') }}
                style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto 20px' }}>
                ← Back
              </button>
              <div style={{
                width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
                background: 'rgba(124,108,252,0.15)', border: '1.5px solid rgba(124,108,252,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
              }}>🛡️</div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 6 }}>
                Verify your email
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                We sent a 6-digit code to<br />
                <strong style={{ color: 'var(--text)' }}>{form.email}</strong>
              </p>
            </div>

            <form onSubmit={handleOtpSubmit}>
              {err && <div className="error-box" style={{ marginBottom: 8 }}>{err}</div>}
              <OtpInput value={otp} onChange={setOtp} disabled={loading || expired} />
              <div style={{ textAlign: 'center', marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
                {expired
                  ? <span style={{ color: '#f87171' }}>Code expired</span>
                  : <>Code expires in <Countdown seconds={300} onExpire={() => setExpired(true)} /></>
                }
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginBottom: 12 }}
                disabled={loading || expired || otp.length < 6}>
                {loading ? <><span className="spinner" /> Verifying…</> : 'Create Account'}
              </button>
              <button type="button" onClick={handleResend} disabled={resending}
                style={{
                  width: '100%', padding: '11px', background: 'none',
                  border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 14, opacity: resending ? 0.6 : 1
                }}>
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}