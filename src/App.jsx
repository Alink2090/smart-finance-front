import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth }          from './context/AuthContext'
import { useOffline }       from './context/OfflineContext'
import { useOfflineAuth }   from './hooks/useOfflineAuth'
import { useServiceWorker } from './hooks/useServiceWorker'
import DashboardLayout from './layouts/DashboardLayout'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Dashboard       from './pages/Dashboard'
import Transactions    from './pages/Transactions'
import Budgets         from './pages/Budgets'
import Analytics       from './pages/Analytics'
import Categories      from './pages/Categories'
import Insights        from './pages/Insights'
import Reports         from './pages/Reports'
import Settings        from './pages/Settings'
import InstallButton   from './components/InstallButton'
import UpdateBanner    from './components/UpdateBanner'
import PinScreen       from './components/offline/PinScreen'

// ── Loaders ───────────────────────────────────────────────────────────────────
function Loader() {
  // Avec le nouveau AuthContext, loading=true dure < 1 frame (localStorage sync)
  // Ce loader ne devrait s'afficher que quelques millisecondes max
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

// ── Gate PIN hors ligne ───────────────────────────────────────────────────────
// Reçoit online depuis OfflineContext (pas navigator.onLine)
function OfflineGate({ children }) {
  const { user }   = useAuth()
  const { online } = useOffline()
  const { locked, checking, noPin, pinError, pinVerifying, submitPin } = useOfflineAuth(user, online)

  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div className="spinner" style={{ width:24, height:24, borderWidth:2 }} />
    </div>
  )

  if (locked && noPin) {
    // Offline sans PIN configuré → message explicatif
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'var(--bg)', padding:32, textAlign:'center',
      }}>
        <div style={{ fontSize:56, marginBottom:20 }}>🔒</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:12, letterSpacing:'-.03em' }}>
          Accès hors ligne désactivé
        </h2>
        <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, maxWidth:280, marginBottom:28 }}>
          Pour accéder à l'application sans connexion, vous devez d'abord activer le mode hors ligne
          et configurer un code PIN dans les Paramètres.
        </p>
        <p style={{ fontSize:12, color:'var(--text3)' }}>
          Connectez-vous au réseau pour accéder à l'application.
        </p>
      </div>
    )
  }

  if (locked) {
    return (
      <PinScreen
        onSubmit={pin => submitPin(pin)}
        error={pinError}
        verifying={pinVerifying}
        userName={user?.name}
      />
    )
  }

  return children
}

// ── App principale ────────────────────────────────────────────────────────────
export default function App() {
  const { needRefresh, applyUpdate, dismissUpdate } = useServiceWorker()

  return (
    <>
      <InstallButton />

      {needRefresh && (
        <UpdateBanner onUpdate={applyUpdate} onDismiss={dismissUpdate} />
      )}

      <OfflineGate>
        <Routes>
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets"      element={<Budgets />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/insights"     element={<Insights />} />
            <Route path="/reports"      element={<Reports />} />
            <Route path="/categories"   element={<Categories />} />
            <Route path="/settings"     element={<Settings />} />
            <Route path="/more"         element={<Navigate to="/insights" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </OfflineGate>
    </>
  )
}
